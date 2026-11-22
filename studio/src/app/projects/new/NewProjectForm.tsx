"use client";

import { useActionState } from "react";
import { createProjectAction, type CreateState } from "../actions";

export function NewProjectForm() {
  const [state, action, pending] = useActionState<CreateState, FormData>(createProjectAction, {});
  return (
    <form action={action} className="grid gap-5 lg:grid-cols-2">
      <div className="card space-y-4">
        <h2 className="font-semibold">Project</h2>
        <div>
          <label className="label" htmlFor="title">Project title *</label>
          <input id="title" name="title" required className="field" placeholder="Moolank 9 – Mangal" />
        </div>
        <div>
          <label className="label" htmlFor="topic">Astrology topic</label>
          <input id="topic" name="topic" className="field" placeholder="मूलांक 9 – स्वभाव, उपाय, लकी रंग" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="videoType">Video type</label>
            <select id="videoType" name="videoType" className="field" defaultValue="Numerology (Moolank)">
              <option>Numerology (Moolank)</option>
              <option>Rashi / zodiac</option>
              <option>Planetary transit</option>
              <option>Daily rashifal</option>
              <option>Weekly / monthly rashifal</option>
              <option>Educational (long)</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="format">Format</label>
            <select id="format" name="format" className="field" defaultValue="short">
              <option value="short">Short · 9:16 · 1080×1920</option>
              <option value="long">Long · 16:9 · 1920×1080</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="voiceProvider">Voice</label>
            <select id="voiceProvider" name="voiceProvider" className="field" defaultValue="flow-native">
              <option value="flow-native">Flow presenter voice (lip-synced)</option>
              <option value="elevenlabs">ElevenLabs (TTS)</option>
              <option value="sarvam">Sarvam AI (TTS)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="voiceId">Voice ID (TTS)</label>
            <input id="voiceId" name="voiceId" className="field" placeholder="optional" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="visualStyle">Visual style</label>
          <input
            id="visualStyle"
            name="visualStyle"
            className="field"
            defaultValue="Lavish Astro house style: presenter in navy-gold constellation sherwani, deep-space galaxy, gold zodiac wheel, warm cinematic light"
          />
        </div>
        <div>
          <label className="label" htmlFor="referenceImages">Reference images (presenter photo, looks)</label>
          <input id="referenceImages" name="referenceImages" type="file" multiple accept="image/jpeg,image/png,image/webp" className="field" />
        </div>
      </div>

      <div className="card flex flex-col space-y-4">
        <h2 className="font-semibold">Script</h2>
        <p className="text-xs text-muted">
          Paste the approved script (Hindi dialogue is fine) or upload a .txt. It is stored unchanged; analysis in Phase 3
          never rewrites it without your approval.
        </p>
        <textarea name="script" className="field min-h-64 flex-1 font-sans" placeholder="रुकिए! अगर आपका जन्म 9, 18 या 27 तारीख को हुआ है…" />
        <div>
          <label className="label" htmlFor="scriptFile">…or upload script file</label>
          <input id="scriptFile" name="scriptFile" type="file" accept=".txt,.md,text/plain" className="field" />
        </div>
        {state.error && <p className="rounded-md bg-red/15 px-3 py-2 text-sm text-red">{state.error}</p>}
        <button type="submit" className="btn self-start" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </button>
      </div>
    </form>
  );
}
