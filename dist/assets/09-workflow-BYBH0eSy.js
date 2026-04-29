import{u as h,j as e}from"./index-CsFQQOkc.js";const f={id:"v2-workflow",title:"The New Creative Workflow"};function m(i){const t={p:"p",...h(),...i.components},{Annotation:o,Body:s,Demo:a,Eyebrow:r,Overlay:l,Prompt:c,Title:d}=t;return o||n("Annotation"),s||n("Body"),a||n("Demo"),r||n("Eyebrow"),l||n("Overlay"),c||n("Prompt"),d||n("Title"),e.jsxs(e.Fragment,{children:[e.jsx(a,{projectId:"monument-valley"}),`
`,e.jsxs(l,{position:"bottom-left",children:[e.jsx(r,{children:"Prompting becomes a pipeline"}),e.jsx(d,{children:"Gemini made the tileset. AI coding turned it into a scene."}),e.jsx(s,{children:e.jsx(t.p,{children:`For this project, I used Gemini to generate the isometric tileset itself:\r
stairs, arches, columns, platforms, and impossible little palace pieces in\r
a consistent style.`})}),e.jsx(s,{children:e.jsx(t.p,{children:`Then I handed that tileset to a coding model and asked it to build the\r
p5.js Wave Function Collapse sketch around those pieces. The workflow is not\r
"AI made the art" — it is AI helping me create assets, systems, and a\r
starting point I can direct.`})}),e.jsx(c,{label:"What the coding prompt looked like next",children:`"Build me a Monument Valley–style isometric scene in p5.js.
Use Wave Function Collapse to generate a small floating
island of impossible architecture — stepped towers, arches,
and staircases — from the tileset Gemini generated for me.

Watch each tile collapse into place one cell at a time so
you can see the algorithm think. Then have a tiny figure
walk a path across the finished structure. When it finishes,
generate a new island and start again."`}),e.jsx(s,{children:e.jsx(t.p,{children:`Then I can learn the code line by line and make it mine: my composition,\r
my pacing, my references, my edits.`})})]}),`
`,e.jsx(o,{position:"top-right",dismissable:!1,children:e.jsxs("div",{style:{display:"grid",gap:"0.75rem"},children:[e.jsx("img",{src:"/slides/TilesetProcess.png",alt:"Gemini prompt and generated isometric tileset used as the basis for the Monument Valley workflow.",style:{display:"block",width:"min(34rem, 72vw)",maxWidth:"100%",borderRadius:"0.75rem"}}),e.jsx("p",{style:{margin:0,color:"var(--color-text-muted, #9a9a9a)",fontSize:"0.82rem",lineHeight:1.5},children:e.jsx(t.p,{children:`Gemini generated the visual tileset first. That tileset became the input\r
for the procedural scene and animation.`})})]})})]})}function u(i={}){const{wrapper:t}={...h(),...i.components};return t?e.jsx(t,{...i,children:e.jsx(m,{...i})}):m(i)}function n(i,t){throw new Error("Expected component `"+i+"` to be defined: you likely forgot to import, pass, or provide it.")}export{u as default,f as meta};
