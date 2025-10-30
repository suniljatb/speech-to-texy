import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'

type Phase = 'idle' | 'recording' | 'processing' | 'done' | 'error'

export default function App(){
  const [phase, setPhase] = useState<Phase>('idle')
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('en')
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  useEffect(()=>{
    return ()=>{
      if(audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  async function startRecording(){
    setError(null)
    setText('')
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = (e)=>{ if(e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async ()=>{
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        await upload(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setPhase('recording')
    }catch(err: any){
      setError(err?.message || 'Microphone access failed')
      setPhase('error')
    }
  }

  function stopRecording(){
    if(mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive'){
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t=>t.stop())
      setPhase('processing')
    }
  }

  async function upload(blob: Blob){
    try{
      const form = new FormData()
      form.append('audio', blob, 'audio.webm')
      form.append('language', language)
      const res = await axios.post('http://localhost:8000/api/v1/transcribe', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setText(res.data?.text || '')
      setPhase('done')
    }catch(err: any){
      setError(err?.response?.data?.detail || err?.message || 'Upload failed')
      setPhase('error')
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Speech-to-Text Converter</h1>
            <p className="text-slate-400 text-sm">React + FastAPI (Whisper) • Local</p>
          </div>
          <select value={language} onChange={e=>setLanguage(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm">
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="bn">Bengali</option>
            <option value="gu">Gujarati</option>
            <option value="pa">Punjabi</option>
            <option value="ur">Urdu</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </header>

        <div className="flex gap-3">
          <button onClick={startRecording} disabled={phase==='recording'} className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-medium disabled:opacity-50">Start</button>
          <button onClick={stopRecording} disabled={phase!=='recording'} className="px-4 py-2 rounded-lg bg-rose-400 text-slate-900 font-medium disabled:opacity-50">Stop</button>
        </div>

        <div className="text-sm text-slate-300">
          {phase==='idle' && <span>Idle</span>}
          {phase==='recording' && <span className="text-amber-300">Recording…</span>}
          {phase==='processing' && <span className="text-sky-300">Processing…</span>}
          {phase==='done' && <span className="text-emerald-300">Done</span>}
          {phase==='error' && <span className="text-rose-300">Error</span>}
        </div>

        {audioUrl && (
          <audio controls src={audioUrl} className="w-full" />
        )}

        <section>
          <h2 className="text-sm text-slate-400 mb-2">Transcript</h2>
          <div className="min-h-[160px] bg-slate-900 border border-slate-700 rounded-xl p-4 whitespace-pre-wrap">
            {text || <span className="text-slate-500">No transcript yet.</span>}
          </div>
        </section>

        {error && (
          <div className="text-rose-300 text-sm">{error}</div>
        )}
      </div>
    </div>
  )
}



