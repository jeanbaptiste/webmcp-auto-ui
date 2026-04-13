# Gemma 4 — Tool Calling: Retour d'expérience complet

> Document compilé à partir de 5 sources : docs officielles Google, vLLM recipes, GitHub issue opencode #20995, article Medium Google Cloud, et communauté X/Twitter. Date : 2026-04-13.

---

## Résumé exécutif

Gemma 4 utilise un **protocole de tool calling propriétaire** basé sur des tokens spéciaux (`<|tool_call>`, `<tool_call|>`, etc.) radicalement différent du format OpenAI. Quand on passe par une couche de compatibilité OpenAI (Ollama, vLLM en mode `/v1/chat/completions`), la traduction est imparfaite et source de nombreux bugs — notamment en mode streaming.

Points critiques à retenir :
- Le format natif et le format OpenAI-compatible sont **deux choses distinctes** — ne pas les confondre
- vLLM nécessite `--tool-call-parser gemma4` et un template Jinja dédié pour fonctionner
- Ollama <0.20.2 avait un bug critique : les tool_calls atterrissaient dans le champ `reasoning` au lieu de `tool_calls`
- En streaming, plusieurs clients AI SDK ne reconnaissent pas les tool calls de Gemma 4 (bug opencode #20995)
- `enable_thinking=True` améliore significativement la précision du tool calling
- Performance : 86.4% sur tau2-bench (vs 6.6% pour Gemma 3)

---

## 1. Format natif Gemma 4 (source : docs.google.dev)

### Tokens spéciaux

Gemma 4 définit un protocole de tool calling avec des tokens dédiés :

| Token | Rôle |
|-------|------|
| `<\|tool_call>` | Début d'un appel de fonction |
| `<tool_call\|>` | Fin d'un appel de fonction |
| `<\|tool_response>` | Début de la réponse d'un outil |
| `<tool_response\|>` | Fin de la réponse d'un outil |
| `<\|channel>thought\n...<channel\|>` | Bloc de réflexion (thinking mode) |

### Structure des messages (format natif)

```
<|turn>system
[system prompt]<|turn>
<|turn>user
[user message]<|turn>
<|turn>model
[model response]<|turn|>
```

### Déclaration d'un outil (format natif)

```
<|tool>declaration:function_name{
  description:"Gets current temperature for a city",
  parameters:{
    properties:{
      city:{type:"STRING", description:"City name"},
      unit:{type:"STRING", enum:["celsius","fahrenheit"]}
    },
    required:["city"]
  }
}<tool|>
```

### Appel de fonction généré par le modèle (format natif)

```
<|tool_call>call:get_current_temperature{city:"Tokyo",unit:"celsius"}<tool_call|>
```

Les paramètres de type string utilisent des délimiteurs pipe : `param:<|"|>value<|"|>`

### Réponse de l'outil injectée dans le contexte

```
<|tool_response>response:get_current_temperature{temperature:22,condition:"Partly cloudy"}<tool_response|>
```

### Parsing des tool calls (regex)

```python
import re
pattern = r'<\|tool_call>call:(\w+)\{(.*?)\}<tool_call\|>'
matches = re.findall(pattern, model_output)
```

### Déclaration via JSON Schema (méthode manuelle)

```json
{
  "type": "function",
  "function": {
    "name": "get_current_temperature",
    "description": "Gets current temperature for a location",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "City name, e.g. 'Tokyo'"
        },
        "unit": {
          "type": "string",
          "enum": ["celsius", "fahrenheit"]
        }
      },
      "required": ["location"]
    }
  }
}
```

### Déclaration via fonctions Python (méthode automatique)

```python
from transformers import AutoProcessor

# get_json_schema() convertit automatiquement les type hints
# et les docstrings Google-style en JSON Schema
processor = AutoProcessor.from_pretrained("google/gemma-4-31B-it")
schema = processor.get_json_schema(my_function)
```

**Limitation** : les objets imbriqués complexes (classes Config custom) perdent des détails lors de la conversion automatique. Préférer le JSON Schema manuel dans ce cas.

---

## 2. Format OpenAI-compatible via vLLM (source : docs.vllm.ai/projects/recipes)

### Modèles supportés

| Modèle | Params | GPU minimum (BF16) |
|--------|--------|-------------------|
| Gemma 4 E2B IT | ~2B actifs | 1× 24 GB |
| Gemma 4 E4B IT | ~4B actifs | 1× 24 GB |
| Gemma 4 31B IT | 31B | 1× 80 GB |
| Gemma 4 26B-A4B IT (MoE) | 26B total / 4B actifs | 1× 80 GB |

### Lancement du serveur vLLM avec tool calling

```bash
vllm serve google/gemma-4-31B-it \
  --max-model-len 8192 \
  --enable-auto-tool-choice \
  --tool-call-parser gemma4 \
  --reasoning-parser gemma4 \
  --chat-template examples/tool_chat_template_gemma4.jinja
```

**Flags critiques :**
- `--enable-auto-tool-choice` : active la détection automatique d'appel d'outil
- `--tool-call-parser gemma4` : parseur dédié qui traduit le format natif Gemma 4 vers le format OpenAI
- `--reasoning-parser gemma4` : pour le support du thinking mode en parallèle
- `--chat-template` : le template Jinja officiel est **obligatoire** ; il est inclus dans le container Docker officiel ou disponible dans le repo vLLM

### Installation vLLM (nightly recommandé pour Gemma 4)

```bash
uv venv
source .venv/bin/activate
uv pip install -U vllm --pre \
  --extra-index-url https://wheels.vllm.ai/nightly/cu129 \
  --extra-index-url https://download.pytorch.org/whl/cu129 \
  --index-strategy unsafe-best-match
uv pip install transformers==5.5.0
```

Images Docker dédiées :
```bash
docker pull vllm/vllm-openai:gemma4        # CUDA 12.9
docker pull vllm/vllm-openai:gemma4-cu130  # CUDA 13.0
docker pull vllm/vllm-openai-rocm:gemma4   # AMD GPUs
docker pull vllm/vllm-tpu:gemma4           # Cloud TPUs
```

### Tool calling via OpenAI SDK (flux complet)

```python
from openai import OpenAI
import json

client = OpenAI(base_url="http://localhost:8000/v1", api_key="EMPTY")

tools = [
  {
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Get the current weather for a location",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "City name, e.g. 'San Francisco, CA'"
          },
          "unit": {
            "type": "string",
            "enum": ["celsius", "fahrenheit"]
          }
        },
        "required": ["location"]
      }
    }
  }
]

# Step 1: Envoyer la question avec les outils
response = client.chat.completions.create(
  model="google/gemma-4-31B-it",
  messages=[{"role": "user", "content": "What is the weather in Tokyo today?"}],
  tools=tools,
  max_tokens=1024
)

message = response.choices[0].message

# Step 2: Traiter les tool calls
if message.tool_calls:
  tool_call = message.tool_calls[0]
  print(f"Tool: {tool_call.function.name}")
  print(f"Args: {tool_call.function.arguments}")

  # Step 3: Renvoyer le résultat de l'outil
  response = client.chat.completions.create(
    model="google/gemma-4-31B-it",
    messages=[
      {"role": "user", "content": "What is the weather in Tokyo today?"},
      message,  # message de l'assistant avec le tool_call
      {
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": json.dumps({"temperature": 22, "condition": "Partly cloudy", "unit": "celsius"})
      }
    ],
    tools=tools,
    max_tokens=1024
  )
  print(f"Final answer: {response.choices[0].message.content}")
```

### Tool Calling + Thinking (raisonnement avant d'appeler)

```python
response = client.chat.completions.create(
  model="google/gemma-4-31B-it",
  messages=[{"role": "user", "content": "I need to know the weather in Tokyo..."}],
  tools=tools,
  max_tokens=4096,
  extra_body={
    "chat_template_kwargs": {"enable_thinking": True}
  }
)
```

### Multimodal + Tool Calling (image + outil)

```python
response = client.chat.completions.create(
  model="google/gemma-4-31B-it",
  messages=[{
    "role": "user",
    "content": [
      {"type": "image_url", "image_url": {"url": "https://..."}},
      {"type": "text", "text": "What city is shown? What is the current weather there?"}
    ]
  }],
  tools=tools,
  max_tokens=1024
)
```

---

## 3. Différences : format natif vs format OpenAI-compatible

| Aspect | Format natif Gemma 4 | Format OpenAI-compatible |
|--------|---------------------|------------------------|
| Déclaration d'outils | Tokens `<\|tool>declaration:...` | JSON dans le champ `tools` de la requête |
| Appel de fonction | `<\|tool_call>call:name{args}<tool_call\|>` | Champ `tool_calls` dans `message` |
| Réponse d'outil | `<\|tool_response>response:name{...}<tool_response\|>` | Message avec `role: "tool"` et `tool_call_id` |
| Thinking | `<\|channel>thought\n...<channel\|>` | Champ `reasoning_content` (via vLLM) |
| Parsing | Regex maison | Parser `gemma4` de vLLM (auto) |
| Niveau d'abstraction | Bas niveau, contrôle total | Haut niveau, compatible clients OpenAI |

**Point clé** : vLLM agit comme traducteur entre les deux formats. Le `--tool-call-parser gemma4` et le template Jinja assurent cette traduction. Sans ces deux éléments, vLLM ne reconnaîtra pas les tool calls.

---

## 4. Problèmes connus (Known Issues)

### Bug critique : streaming Ollama < 0.20.2 (Apple Silicon)

**Symptôme** : les tool_calls atterrissent dans le champ `reasoning` au lieu du champ `tool_calls`.

**Cause** : bug dans le streaming de Ollama qui route la réponse au mauvais champ.

**Fix** : upgrader vers Ollama ≥ 0.20.2. Le PR ollama/ollama#15306 a corrigé ce problème.

**Référence** : Medium article (llama.cpp workaround), GitHub issue #20995

---

### Bug : Flash Attention freeze sur Apple Silicon (Ollama)

**Symptôme** : la génération se bloque indéfiniment sur des prompts > 500 tokens avec Flash Attention activé.

**Cause** : incompatibilité Flash Attention avec les prompts longs sur Apple Silicon (Ollama 0.20.3).

**Fix** : utiliser llama.cpp directement avec `-np 1` et sans Flash Attention, ou upgrader Ollama.

**Référence** : Medium article

---

### Bug : tool calls non reconnus en streaming (opencode #20995)

**Symptôme** : le modèle via Ollama renvoie bien les `tool_calls` (confirmé par curl direct), mais l'AI SDK (`@ai-sdk/openai-compatible`) ne les reconnaît pas en mode streaming. Le modèle répond "I do not have the capability to execute system commands" au lieu d'appeler l'outil.

**Cause** : le `toolParser` compat layer de l'AI SDK ne gère pas correctement les tool calls Gemma 4 en streaming — différences de format dans les deltas.

**Workaround** : utiliser un autre modèle (ex: qwen3.5:9b) ou attendre le merge du PR #16531.

**Diagnostic de l'issue** : l'API Ollama fonctionne correctement (non-streaming ET streaming) — le problème est côté client SDK.

```bash
# Vérification directe (fonctionne correctement)
curl -s http://localhost:11434/v1/chat/completions -d '{
  "model": "gemma4:e4b",
  "messages": [{"role": "user", "content": "list files in /tmp"}],
  "stream": false,
  "tools": [{"type": "function", "function": {"name": "bash", "description": "Execute a shell command", "parameters": {"type": "object", "required": ["command"], "properties": {"command": {"type": "string"}}}}}]
}'
# Retourne: finish_reason: "tool_calls", tool_calls: [{function: {name: "bash", arguments: "{\"command\":\"ls /tmp\"}"}}]
```

**Référence** : GitHub anomalyco/opencode#20995 (ouvert le 4 avril 2026)

---

### Incompatibilité vLLM 0.19.0 avec NVIDIA Blackwell (GB10)

**Symptôme** : ImportError au lancement de vLLM sur GPU NVIDIA Blackwell.

**Cause** : PyTorch 2.10.0 embarqué dans vLLM 0.19.0 est incompatible avec PyTorch 2.11.0+ (CUDA Blackwell), ABI différente.

**Fix** : utiliser les wheels nightly vLLM (`--extra-index-url https://wheels.vllm.ai/nightly/cu129`) ou le Docker officiel `vllm/vllm-openai:gemma4`.

**Référence** : Medium article

---

### Piège llama.cpp : `-hf` flag télécharge le vision projector (1.1 GB)

**Symptôme** : OOM crash lors du démarrage avec Gemma 4 26B MoE en local.

**Cause** : le flag `-hf` (HuggingFace auto-download) télécharge silencieusement le vision projector de 1.1 GB en plus du modèle.

**Fix** : utiliser le chemin direct `--model /path/to/model.gguf` au lieu de `-hf`.

**Référence** : Medium article

---

### Timeout de session sur les cycles tool calling longs

**Symptôme** : la session se ferme pendant un cycle tool calling multi-étapes.

**Cause** : les cycles de tool calling Gemma 4 peuvent prendre 99 secondes sur Mac M4 Pro. Le timeout par défaut de Codex CLI tue la session.

**Fix** : configurer `stream_idle_timeout_ms: 1800000` (30 minutes).

**Référence** : Medium article

---

### Types d'outils non-function rejetés par certains serveurs

**Symptôme** : erreur si `web_search_preview` (type non-standard) est dans la liste des outils.

**Cause** : llama.cpp et certains serveurs d'inférence rejettent les types d'outils non-function.

**Fix** : désactiver les outils à type non-standard (ex: `web_search = "disabled"` dans Codex CLI), ou utiliser `wire_api = "responses"`.

**Référence** : Medium article

---

## 5. Bonnes pratiques

### Général

1. **Toujours valider** les noms de fonctions et les arguments avant exécution — le modèle peut halluciner des noms de fonctions inexistants
2. **Ne pas utiliser `globals()`** pour résoudre les fonctions en production ; préférer un mapping explicite `{"function_name": actual_function}`
3. **Descriptions détaillées** pour chaque paramètre — Gemma 4 en dépend fortement pour comprendre ce qu'il doit passer
4. **JSON Schema manuel** pour les objets complexes — la conversion automatique depuis les type hints Python perd les détails des classes imbriquées
5. **`enable_thinking=True`** améliore significativement la précision du tool calling (le modèle raisonne avant d'appeler)

### Pour vLLM en production

```bash
# Configuration complète recommandée
vllm serve google/gemma-4-31B-it \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.90 \
  --enable-auto-tool-choice \
  --tool-call-parser gemma4 \
  --reasoning-parser gemma4 \
  --chat-template examples/tool_chat_template_gemma4.jinja \
  --tensor-parallel-size 2  # pour 31B sur 2× A100
```

### Pour llama.cpp local (Apple Silicon)

```bash
# Flags critiques
./llama-server \
  -m /path/to/gemma-4-26b-a4b-it-q4_k_m.gguf \
  --jinja \       # active le template de tool calling
  -np 1 \         # single slot pour KV cache (requis pour tool calling)
  -ctk q8_0 \     # KV cache quantization (940MB -> 499MB)
  -ctv q8_0 \
  -c 32768        # contexte minimum recommandé
# NE PAS utiliser -hf (télécharge vision projector)
```

### Choix du modèle

| Situation | Recommandation |
|-----------|---------------|
| Précision maximale | 31B Dense ou 26B MoE avec thinking activé |
| Vitesse (Apple Silicon) | 26B MoE Q4_K_M (activeque 3.8B params/token) |
| GPU limité (24 GB) | E4B-it (efficacement ~4B params actifs) |
| Production serveur | vLLM avec 31B ou 26B MoE sur GPU 80 GB |

---

## 6. Recommandations pour notre stack WebMCP

### Contexte

Notre stack utilise `GemmaProvider` du package `@webmcp-auto-ui/agent`, qui s'appuie sur LiteRT (in-browser WASM) en main thread. Les modèles Gemma 4 ciblés sont les variantes E2B/E4B (les seuls assez petits pour tourner in-browser).

### Ce que font nos docs vs ce que recommandent les sources

| Aspect | Notre stack actuelle | Ce que recommandent les sources |
|--------|---------------------|--------------------------------|
| Format d'outil | Probablement standard OpenAI via `GemmaProvider` | Utiliser le template Jinja officiel + parser `gemma4` si via vLLM |
| Thinking mode | Non documenté pour Gemma 4 | `enable_thinking: true` dans `chat_template_kwargs` — améliore la précision |
| Streaming tool calls | Via notre agent loop | Risque de non-détection (bug opencode #20995) — valider que notre parser gère les deltas Gemma 4 |
| Validation des arguments | Non documenté | Ajouter validation avant exécution |
| Descriptions des outils | Format MCP standard | S'assurer que les descriptions sont suffisamment détaillées (Gemma 4 en dépend) |
| Timeout | Non documenté | Configurer des timeouts longs pour les cycles multi-outils (100s+ observés) |

### Actions recommandées

1. **Vérifier notre handling du streaming** : le bug opencode #20995 montre que l'AI SDK ne détecte pas toujours les tool_calls Gemma 4 en streaming. Auditer notre `runAgentLoop` pour s'assurer qu'il parse correctement les deltas streaming de Gemma 4.

2. **Tester `enable_thinking`** pour les modèles Gemma 4 via notre `RemoteLLMProvider` (serveur vLLM) — score de précision potentiellement bien meilleur.

3. **Si on déploie Gemma 4 via vLLM** : ne pas oublier les 3 flags obligatoires (`--enable-auto-tool-choice`, `--tool-call-parser gemma4`, `--chat-template`) + utiliser le Docker officiel `vllm/vllm-openai:gemma4`.

4. **Versions Ollama** : si on supporte Ollama comme backend, s'assurer que l'utilisateur a ≥ 0.20.2. En dessous, les tool_calls arrivent dans le mauvais champ.

5. **MoE vs Dense** : pour du local sur Apple Silicon, le 26B MoE est plus rapide que le 31B Dense car seuls ~4B params sont actifs par token. Documenter ce choix dans notre `GemmaProvider`.

---

## Sources

1. **Google AI for Developers** — https://ai.google.dev/gemma/docs/capabilities/text/function-calling-gemma4 — Documentation officielle du format natif et des JSON Schemas
2. **vLLM Recipes** — https://docs.vllm.ai/projects/recipes/en/latest/Google/Gemma4.html — Guide de déploiement complet avec exemples de code pour le tool calling via OpenAI SDK
3. **GitHub anomalyco/opencode#20995** — https://github.com/anomalyco/opencode/issues/20995 — Bug report détaillé sur la non-détection des tool_calls Gemma 4 en streaming via AI SDK
4. **Medium Google Cloud** — https://medium.com/google-cloud/i-ran-gemma-4-as-a-local-model-in-codex-cli-7fda754dc0d4 — Retour d'expérience pratique : bugs Ollama, llama.cpp, performances, timeouts
5. **X/@PawelHuryn** — https://x.com/PawelHuryn/status/2040498812318273583 — Non accessible (402), contenu non extrait
