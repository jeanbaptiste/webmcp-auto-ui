/*
 * TurboQuant — Minimal WASM vector quantizer for nano-RAG.
 * Walsh-Hadamard random rotation + scalar quantization.
 * No stdlib. Compiled with: clang --target=wasm32 -O3 -nostdlib
 */

/* ── Bump allocator ─────────────────────────────────────────────── */

static unsigned char heap[4 * 1024 * 1024]; /* 4 MB */
static int heap_pos = 0;

unsigned char* alloc(int size) {
    /* align to 8 bytes */
    size = (size + 7) & ~7;
    int pos = heap_pos;
    heap_pos += size;
    return &heap[pos];
}

void reset_heap(void) {
    heap_pos = 0;
}

/* ── Walsh-Hadamard random rotation ─────────────────────────────── */

void random_rotate(float* vec, int d, unsigned int seed) {
    int i, j, len, log2d;
    float a, b, norm;
    unsigned int rng = seed;

    /* 1. Random sign flips via LCG */
    for (i = 0; i < d; i++) {
        rng = rng * 1664525u + 1013904223u;
        if (rng & 1u) vec[i] = -vec[i];
    }

    /* 2. In-place Walsh-Hadamard transform */
    for (len = 1; len < d; len <<= 1) {
        for (i = 0; i < d; i += len << 1) {
            for (j = 0; j < len; j++) {
                a = vec[i + j];
                b = vec[i + j + len];
                vec[i + j]       = a + b;
                vec[i + j + len] = a - b;
            }
        }
    }

    /* 3. Normalize: multiply by 1/sqrt(d) = (1/sqrt(2))^log2(d) */
    log2d = 0;
    for (i = d; i > 1; i >>= 1) log2d++;
    norm = 1.0f;
    for (i = 0; i < log2d; i++) norm *= 0.7071067811865475f;
    for (i = 0; i < d; i++) vec[i] *= norm;
}

/* ── Scalar quantizer ───────────────────────────────────────────── */

/*
 * Output layout: [d quantized bytes] [4 bytes min_f32] [4 bytes range_f32]
 * Total: d + 8 bytes.
 */

void quantize(float* input, unsigned char* output, int d, int bits_per_dim) {
    int i, q;
    int levels = 1 << bits_per_dim;
    float mn, mx, range, scale, val;

    mn = input[0];
    mx = input[0];
    for (i = 1; i < d; i++) {
        if (input[i] < mn) mn = input[i];
        if (input[i] > mx) mx = input[i];
    }

    range = mx - mn;
    if (range < 1e-10f) range = 1e-10f;
    scale = (float)(levels - 1) / range;

    for (i = 0; i < d; i++) {
        val = (input[i] - mn) * scale;
        q = (int)(val + 0.5f);
        if (q < 0)          q = 0;
        if (q >= levels)     q = levels - 1;
        output[i] = (unsigned char)q;
    }

    /* Store metadata after the quantized bytes */
    *((float*)(output + d))     = mn;
    *((float*)(output + d + 4)) = range;
}

void dequantize(unsigned char* input, float* output, int d, int bits_per_dim) {
    int i;
    int levels = (1 << bits_per_dim) - 1;
    float mn       = *((float*)(input + d));
    float range    = *((float*)(input + d + 4));
    float inv_scale = range / (float)levels;

    for (i = 0; i < d; i++) {
        output[i] = mn + (float)input[i] * inv_scale;
    }
}

/* ── Dot products ───────────────────────────────────────────────── */

float dot_quantized(unsigned char* a, unsigned char* b, int d, int bits_per_dim) {
    int i;
    int levels = (1 << bits_per_dim) - 1;

    float mn_a    = *((float*)(a + d));
    float range_a = *((float*)(a + d + 4));
    float mn_b    = *((float*)(b + d));
    float range_b = *((float*)(b + d + 4));

    float inv_a = range_a / (float)levels;
    float inv_b = range_b / (float)levels;

    float sum = 0.0f;
    for (i = 0; i < d; i++) {
        float va = mn_a + (float)a[i] * inv_a;
        float vb = mn_b + (float)b[i] * inv_b;
        sum += va * vb;
    }
    return sum;
}

float dot_asymmetric(float* query, unsigned char* quantized, int d, int bits_per_dim) {
    int i;
    int levels = (1 << bits_per_dim) - 1;
    float mn       = *((float*)(quantized + d));
    float range    = *((float*)(quantized + d + 4));
    float inv_scale = range / (float)levels;

    float sum = 0.0f;
    for (i = 0; i < d; i++) {
        float val = mn + (float)quantized[i] * inv_scale;
        sum += query[i] * val;
    }
    return sum;
}
