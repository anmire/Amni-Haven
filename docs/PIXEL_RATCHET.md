# PixelRatchet: GPU-Hardened Forward Secrecy

## The Concept
Standard "Ratchet" algorithms (Signal, OTR) use algebraic math (HMAC-SHA256, Elliptic Curves) to evolve the encryption key for every message. This ensures that if a key is stolen, past messages cannot be read (Forward Secrecy).

**PixelRatchet** replaces the algebraic math with **GPU Physics Simulation**.

## The Mechanism
1.  **The Master Key:** Is not a string. It is a **256x256 RGBA Floating Point Texture** (The "Seed State").
2.  **The Ratchet Step:** To generate the key for Message N+1 from Message N:
    *   Load Texture N into the GPU.
    *   Run a **Reaction-Diffusion Shader** (Gray-Scott Model) for 100 frames.
    *   The result is Texture N+1.
3.  **The Encryption Key:**
    *   Downsample Texture N+1 to 32 bytes (via Average Pooling).
    *   Use this as the key for the `PixelCipher` compute shader.

## Why it is SOTA (State-of-the-Art)
*   **ASIC Resistance:** An attacker trying to brute-force the key chain cannot use standard SHA-256 ASICs. They must simulate the exact floating-point deviations of the specific GPU architecture used.
*   **Latency Bound:** Unlike SHA-256 which is optimized for throughput, fluid simulations are iterative and latency-bound. You cannot parallelize the 100-frame simulation; you must calculate Frame 1 to get Frame 2. This slows down brute-force attacks by orders of magnitude.
*   **Massive State:** The internal state of the ratchet is 1 MB (256x256x4 floats), compared to 32 bytes for standard crypto. This forces attackers to use massive memory bandwidth, bottlenecking them further.

## Implementation Plan
1.  **Shader:** `ratchet.wgsl` - Implements Gray-Scott Reaction-Diffusion.
2.  **Key Gen:** Render 100 passes to a framebuffer.
3.  **Readback:** Read the center pixel or average the texture to get the 256-bit symmetric key.
