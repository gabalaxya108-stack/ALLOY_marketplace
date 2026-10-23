# ALLOY Pipeline & Media Handling Invariants

1. **Pipeline Candidate Sanitization Before Wire Transmission**:
   - Never serialize raw binary data (such as base64 `data:image/...` or `data:video/...` URIs) into HTTP POST requests to `/api/pipeline/filter` or AI evaluation endpoints.
   - Always run candidates through `sanitizePipelineCandidates()` to retain all evaluation metadata (`creativeStyle`, `format`, `tools`, `capabilities`, `clientType`, `projects`) while referencing media via lightweight storage paths or durable URLs.

2. **Durable Media Reference Lifecycle**:
   - Never persist ephemeral browser `blob:` URLs into database records or localStorage.
   - All uploaded media must be resolved to durable storage paths (`storagePath`), Supabase storage URLs, or durable identifiers before persisting project records.

3. **Deterministic Filtering Pipeline Invariants**:
   - Every candidate evaluated by `server/filteringPipeline.js` must be partitioned into exactly ONE of the three disjoint outcomes: `ELIGIBLE`, `INELIGIBLE`, or `REQUIRES_REVIEW`.
   - Zero candidate loss must always be preserved.
   - Project-level creative style evidence must never bypass unrelated mandatory constraints (e.g. licensing or tools).
