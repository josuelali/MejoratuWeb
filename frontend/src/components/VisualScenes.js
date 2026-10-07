import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { Bot, Search, Gauge, Eye, Shield, PhoneCall, Target, ArrowRight, Check } from "lucide-react";

// One clock per visible scene. Hidden tabs and reduced motion never run a clock.
function useSceneClock(length, interval) {
  const ref = useRef(null);
  const visible = useInView(ref, { amount: 0.25 });
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [tabVisible, setTabVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const playing = visible && tabVisible && !reduced;
  useEffect(() => {
    if (!playing || !interval) return undefined;
    const timer = setInterval(() => setStep(value => (value + 1) % length), interval);
    return () => clearInterval(timer);
  }, [playing, length, interval]);
  return { ref, step, playing, reduced };
}

export function HeroAtmosphere() {
  const { ref, playing } = useSceneClock(1, 0);
  return <div ref={ref} className="hero-atmosphere" data-playing={playing} aria-hidden="true">
    <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
    <div className="hero-grid" /><div className="hero-sweep" />
    <svg className="hero-circuit" viewBox="0 0 1200 750" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="currentColor" strokeWidth="1"><path d="M0 210H210L330 330H470M1200 200H1040L900 340H780M0 530H180L300 410H460M1200 570H1000L860 430H760" /></g>
      {[[210,210],[330,330],[1040,200],[900,340],[180,530],[300,410],[1000,570],[860,430]].map(([x,y],i) => <circle key={i} className="circuit-node" cx={x} cy={y} r="3" style={{ animationDelay: `${i * .6}s` }} />)}
    </svg>
    <div className="hero-coordinate coordinate-left">URL / STRUCTURE / EXPERIENCE</div>
    <div className="hero-coordinate coordinate-right">DISCOVER. IMPROVE. CONNECT.</div>
  </div>;
}

const scanSteps = [
  ["URL", Search], ["SEO", Search], ["PERFORMANCE", Gauge],
  ["UX", Eye], ["SEGURIDAD", Shield], ["DIAGNÓSTICO", Check],
];
export function DiagnosticHud() {
  const { ref, step, playing, reduced } = useSceneClock(6, 1400);
  return <div ref={ref} className="scan-scene scene-panel" data-playing={playing}>
    <div className="scene-caption"><span>VISUALIZACIÓN DE ESCANEO</span><strong>DEMO</strong></div>
    <div className="scan-browser" aria-hidden="true"><div className="browser-chrome"><i /><i /><i /><span>https://tu-web.ejemplo</span></div><div className="scan-page"><div className="scan-wireframe"><i /><i /><i /><i /></div><div className="scan-beam" /></div></div>
    <ol className="scan-nodes" aria-label="Etapas ilustrativas del diagnóstico">
      {scanSteps.map(([label, Icon], index) => <li key={label} data-active={reduced || index <= step}><span className="scan-node"><Icon size={18} aria-hidden="true" /></span><span>{label}</span></li>)}
    </ol>
    <div className="scene-footer"><span className="signal-dot" />Secuencia ilustrativa · sin puntuaciones ni datos de tu web</div>
  </div>;
}

const agentSteps = ["LLAMADA ENTRANTE", "AGENTE IA CONECTADO", "ATENDIENDO CONSULTA", "CUALIFICANDO", "OPORTUNIDAD DETECTADA", "DERIVANDO AL NEGOCIO"];
export function AgentFlow() {
  const { ref, step, playing, reduced } = useSceneClock(6, 1800);
  return <div ref={ref} className="agent-scene scene-panel" data-playing={playing} data-step={step}>
    <div className="scene-caption"><span>REPRESENTACIÓN DEL SERVICIO</span><strong>DEMO · SIN AUDIO</strong></div>
    <div className="agent-stage" aria-hidden="true">
      <div className="agent-endpoint" data-active={step < 2}><span><PhoneCall size={25} /></span><small>CLIENTE</small></div>
      <div className="signal-link" data-active={step < 4}><i /></div>
      <div className="agent-core"><div className="core-ring" /><div className="core-ring ring-inner" /><span><Bot size={38} /></span><small>AGENTE IA</small></div>
      <div className="signal-link outgoing" data-active={step >= 4}><i /></div>
      <div className="agent-endpoint" data-active={step >= 4}><span><Target size={25} /></span><small>OPORTUNIDAD</small></div>
    </div>
    <div className="voice-wave" data-active={step >= 1 && step <= 3} aria-hidden="true">{Array.from({length:25},(_,i)=><i key={i} style={{"--bar":`${10 + ((i * 17) % 39)}px`,animationDelay:`${i * -.09}s`}} />)}</div>
    <div className="agent-status" aria-hidden="true"><span className="signal-dot" /><span>{reduced ? "CLIENTE → AGENTE IA → OPORTUNIDAD" : agentSteps[step]}</span><small>{String(step + 1).padStart(2,"0")} / 06</small></div>
    <ol className="agent-timeline" aria-label="Secuencia ilustrativa de atención">{agentSteps.map((label,i)=><li key={label} data-active={reduced || i === step}><span>{String(i+1).padStart(2,"0")}</span>{label}</li>)}</ol>
    <p className="scene-footer">Representación ilustrativa. No es una llamada ni actividad real.</p>
  </div>;
}

export function InterventionScene() {
  return <div className="intervention-scene" aria-label="Proceso de intervención SEO, sin resultados simulados">
    <div><span>ANTES</span><div className="document-lines before-lines" aria-hidden="true"><i /><i /><i /></div><small>Prioridad identificada</small></div>
    <ArrowRight aria-hidden="true" />
    <div><span>INTERVENCIÓN</span><div className="intervention-target" aria-hidden="true"><Search size={22} /></div><small>Cambio SEO concreto</small></div>
    <ArrowRight aria-hidden="true" />
    <div><span>DESPUÉS</span><div className="document-lines after-lines" aria-hidden="true"><i /><i /><i /></div><small>Cambio revisado</small></div>
  </div>;
}

const projects = [
  { name: "SISTEMA MAESTRO IA", type: "SaaS / Inteligencia Artificial", style: "saas", title: "Contexto. Asistentes. Continuidad.", tags: ["Contexto de negocio", "Asistentes", "Historial"] },
  { name: "VENDECONIA", type: "E-commerce / Comercio digital", style: "commerce", title: "Del producto al escaparate digital.", tags: ["Catálogo", "Producto", "Comercio digital"] },
  { name: "GADGETSMANIA", type: "Contenido / Afiliación", style: "editorial", title: "Tecnología que merece descubrirse.", tags: ["Contenido", "Tecnología", "Afiliación"] },
];
export function ProjectPortfolio() {
  return <section id="projects" className="project-portfolio" aria-labelledby="projects-title">
    <div className="portfolio-heading"><p className="scene-eyebrow">PROYECTOS DESARROLLADOS</p><h3 id="projects-title">Ideas convertidas en productos digitales.</h3><p>Proyectos desarrollados dentro del ecosistema. No son clientes.</p></div>
    <div className="project-grid">{projects.map(project=><article className={`project-card ${project.style}`} key={project.name}>
      <div className="project-mockup" aria-hidden="true"><div className="browser-chrome"><i /><i /><i /><span>CONCEPTO DE INTERFAZ</span></div><div className="mockup-workspace"><div className="mockup-sidebar"><span /><span /><span /><span /></div><div className="mockup-main"><div className="mockup-title">{project.title}</div><div className="mockup-tiles">{[0,1,2].map(i=><div key={i}><span className="mockup-object" /><i /><i /></div>)}</div><div className="mockup-composer"><span /><ArrowRight size={14}/></div></div></div></div>
      <div className="project-caption"><span className="scene-eyebrow">{project.type}</span><h4>{project.name}</h4><div className="project-tags">{project.tags.map(tag=><span key={tag}>{tag}</span>)}</div><small>Mockup original de interfaz · no es una captura real</small></div>
    </article>)}</div>
  </section>;
}
