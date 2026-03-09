# HYDRA AI Provider Architecture

## Objective
Organize providers by responsibility so the stack remains maintainable and failures are isolated.

## Recommended provider split

### 1. Chat / text reasoning
Primary: Groq
Current status: Supported in code
Recommended models:
- `llama-3.3-70b-versatile`
- `mixtral-8x7b-32768` only if cost/quality tradeoff is acceptable

Why:
- Very good latency for chat
- Can cover most of the assistant text flow

### 2. Speech-to-text (voice to text)
Primary: Groq
Current status: Supported in code
Recommended model:
- `whisper-large-v3-turbo`

Why:
- Good for turn-based voice input

### 3. Text-to-speech (assistant voice output)
Primary: ElevenLabs
Fallback: Browser `speechSynthesis`
Current status: Supported in code

Why:
- ElevenLabs is stronger for natural voice output
- Browser fallback keeps the feature alive when provider billing fails

### 4. Image generation
Primary: Stability AI
Current status: Supported in code
Candidates:
- Fal.ai
- Replicate
- Stability AI
- Ideogram API

Recommendation:
- If focus is realistic and general image generation: Stability AI or Fal.ai
- If focus is prompt-heavy design, posters, typography: Ideogram

### 5. Video generation
Primary: Runway
Current status: Already in project

Why:
- Already integrated
- Clear fit for text-to-video generation

### 6. Web search / retrieval
Primary: Tavily
Current status: Already in project

Why:
- Good search-oriented API for assistant grounding

### 7. Authentication / plans / billing state
Primary: Internal app + database
Current status: Already in project

Why:
- This should remain internal
- External providers should not own user subscription state

### 8. Moderation / business rules
Primary: Internal app rules
Current status: Already in project

Why:
- Safety rules, quota and plan rules should stay local and deterministic

## What is still missing in the current provider stack

### Optional true real-time voice stack
Current architecture is turn-based:
1. user speaks
2. app records a short utterance
3. STT transcribes
4. chat model responds
5. TTS speaks back

This is not true full-duplex real-time conversation.

For true real-time conversation, you usually need:
- streaming microphone audio
- streaming transcription or VAD
- low-latency chat generation
- streaming TTS playback

## Recommended voice conversation architecture

### Option A. Keep turn-based voice
Stack:
- STT: Groq
- LLM: Groq
- TTS: ElevenLabs

Flow:
1. Browser asks microphone permission
2. User speaks for a short window
3. Audio is sent to Groq STT
4. Transcript goes to Groq chat
5. Response text goes to ElevenLabs
6. Audio is played to the user

Pros:
- Simpler
- Fewer moving parts
- Works with your current code structure

Cons:
- Not truly continuous real-time conversation
- User must speak in turns

### Option B. Build true low-latency voice mode
Suggested stack:
- STT streaming: Deepgram or AssemblyAI
- LLM: Groq
- TTS streaming: ElevenLabs

Flow:
1. Browser streams mic chunks continuously
2. STT provider returns partial transcripts
3. Voice activity detection decides end-of-turn
4. Final transcript is sent to Groq
5. Response is streamed to ElevenLabs
6. Audio starts playback before the full answer ends

Pros:
- Feels closer to a real voice assistant
- Lower perceived latency

Cons:
- Requires more engineering
- Requires at least one additional provider beyond Groq + ElevenLabs

## Recommended final stack for your case
If the goal is stability today with minimal provider sprawl:

- Chat: Groq
- STT: Groq
- TTS: ElevenLabs
- Image: Fal.ai or Stability AI
- Video: Runway
- Search: Tavily
- Billing/subscription/auth: internal app

## Environment variables by area

### Groq
- `GROQ_API_KEY`
- `GROQ_CHAT_MODEL`
- `GROQ_STT_MODEL`

### ElevenLabs
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

### Image provider
Depends on chosen provider
Examples:
- `FAL_KEY`
- `STABILITY_API_KEY`
- `REPLICATE_API_TOKEN`
- `IDEOGRAM_API_KEY`

### Video
- `RUNWAY_API_KEY`

### Search
- `TAVILY_API_KEY`

## Practical migration order
1. Make Groq the primary provider for chat
2. Make Groq the primary provider for STT
3. Keep ElevenLabs for TTS with browser fallback
4. Keep Stability AI as the image provider
5. Decide whether voice mode remains turn-based or becomes streaming real-time

## Decision notes
If you want the fewest providers possible, keep voice turn-based.
If you want the best assistant experience, add a streaming STT provider later.
Groq covers chat and STT well, while Stability AI handles images and ElevenLabs handles premium TTS.
