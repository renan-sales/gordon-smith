/* =========================================================
   GORDON & SMITH — personalizar.js  (Fabric.js 5.x)

   Shirt display:
   • Camiseta (all fits): real photo "shirt-product.jpg"
     + canvas pixel recoloring. Slim / Regular / Oversize
     differ only in the print-area size shown on the SAME
     ghost-mannequin base photo.
   • Regata / Moletom: high-quality SVG fallback.
   • Model views: original white-shirt photos, no recoloring
     (avoids tinting skin).

   Finalizar: robust export with try-catch so CORS / file://
   issues never silently swallow the export.

   Zoom: buttons + mouse-wheel via Fabric.js viewportTransform.
   ========================================================= */

(function () {
  'use strict';

  const CW = 460;
  const CH = 496;

  /* ── Print areas (canvas px) ────────────────────────────
     All camiseta fits use the SAME ghost-mannequin photo.
     The width of the print area communicates the fit.    */
  const PRINT = {
    flat: {
      regular:  { x: 152, y: 193, w: 158, h: 178 },
      slim:     { x: 172, y: 193, w: 118, h: 178 },
      oversize: { x: 116, y: 193, w: 230, h: 178 }
    },
    model: {
      regular:  { x: 160, y: 152, w: 145, h: 165 },
      slim:     { x: 174, y: 152, w: 117, h: 165 },
      oversize: { x: 140, y: 152, w: 182, h: 165 }
    },
    'model-f': {
      regular:  { x: 150, y: 160, w: 165, h: 172 },
      slim:     { x: 165, y: 160, w: 135, h: 172 },
      oversize: { x: 130, y: 160, w: 202, h: 172 }
    },
    /* Regata: SVG viewBox 500×540 → canvas 460×496 (scale ≈0.92)
       Body starts at y≈101 (SVG y=110). Print area in chest region. */
    regata: {
      regular:  { x: 150, y: 176, w: 160, h: 230 },
      slim:     { x: 164, y: 176, w: 132, h: 230 },
      oversize: { x: 128, y: 180, w: 202, h: 226 }
    },
    /* Moletom: chest/torso area, print starts below hood (~y=155 SVG → canvas y=143).
       Torso is wide so keep generous width. */
    moletom: {
      regular:  { x: 144, y: 155, w: 170, h: 185 },
      slim:     { x: 158, y: 155, w: 142, h: 185 },
      oversize: { x: 120, y: 160, w: 218, h: 182 }
    }
  };

  /* ── SVG paths ── */
  const PATHS = {
    regata: {
      regular:  'M 200,30 C 218,55 235,76 250,82 C 265,76 282,55 300,30 L 308,50 L 365,110 L 365,516 L 135,516 L 135,110 L 192,50 Z',
      slim:     'M 202,30 C 219,55 236,76 250,82 C 264,76 281,55 298,30 L 305,48 L 355,108 L 355,516 L 145,516 L 145,108 L 195,48 Z',
      oversize: 'M 196,30 C 215,55 232,76 250,82 C 268,76 285,55 304,30 L 314,52 L 382,114 L 382,524 L 118,524 L 118,114 L 186,52 Z'
    },
    moletom: {
      regular:  'M 183,80 C 165,88 140,102 115,116 L 15,160 L 52,256 L 115,236 L 115,524 L 385,524 L 385,236 L 448,256 L 485,160 L 385,116 C 360,102 335,88 317,80 C 305,106 271,126 250,132 C 229,126 195,106 183,80 Z',
      slim:     'M 188,80 C 172,88 153,102 133,114 L 38,156 L 72,250 L 133,232 L 148,524 L 352,524 L 367,232 L 428,250 L 462,156 L 367,114 C 347,102 328,88 312,80 C 302,106 270,126 250,132 C 230,126 198,106 188,80 Z',
      oversize: 'M 178,80 C 155,90 124,110 92,130 L 10,176 L 46,282 L 92,256 L 88,532 L 412,532 L 408,256 L 454,282 L 490,176 L 408,130 C 376,110 345,90 322,80 C 308,106 272,126 250,132 C 228,126 192,106 178,80 Z'
    }
  };

  /* ── App state ── */
  const S = {
    canvas: null,
    color: '#1a1a1a', colorName: 'Preto',
    size: 'M', piece: 'camiseta', fit: 'regular',
    view: 'flat',
    history: [], hIdx: -1,
    exportUrl: null,
    zoom: 1
  };

  /* ── Recolor cache ── */
  const RC = {};

  /* ══════════════════════════════════════
     CANVAS PIXEL RECOLORING
     Only for "flat" view on camiseta (ghost-mannequin photo).
     Background (uniform mid-gray) is preserved unchanged.
  ══════════════════════════════════════ */
  function recolorShirt(hexColor, callback) {
    if (hexColor === '#ffffff' || hexColor === '#f0f0f0') { callback(null); return; }
    if (RC[hexColor]) { callback(RC[hexColor]); return; }

    const img = new Image();
    /* No crossOrigin for local file — avoids CORS taint */
    img.onload = function () {
      const w = img.naturalWidth, h = img.naturalHeight;
      const oc = document.createElement('canvas');
      oc.width = w; oc.height = h;
      const ctx = oc.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const src = ctx.getImageData(0, 0, w, h);
      const dst = ctx.createImageData(w, h);
      const s = src.data, d = dst.data;

      const tr = parseInt(hexColor.slice(1,3), 16) / 255;
      const tg = parseInt(hexColor.slice(3,5), 16) / 255;
      const tb = parseInt(hexColor.slice(5,7), 16) / 255;

      for (let i = 0; i < s.length; i += 4) {
        const r = s[i]/255, g = s[i+1]/255, b = s[i+2]/255;
        const lum = 0.299*r + 0.587*g + 0.114*b;
        const vari = Math.abs(r-g) + Math.abs(g-b) + Math.abs(r-b);

        /* Background: neutral mid-gray (uniform, no texture) */
        if (vari < 0.09 && lum > 0.55 && lum < 0.88) {
          d[i]=s[i]; d[i+1]=s[i+1]; d[i+2]=s[i+2]; d[i+3]=255;
          continue;
        }

        /* Shirt pixel: target color × luminance + tiny specular */
        const spec = lum * 0.07;
        d[i]   = Math.min(255, Math.round((tr*lum + spec)*255));
        d[i+1] = Math.min(255, Math.round((tg*lum + spec)*255));
        d[i+2] = Math.min(255, Math.round((tb*lum + spec)*255));
        d[i+3] = 255;
      }
      ctx.putImageData(dst, 0, 0);

      let dataUrl;
      try { dataUrl = oc.toDataURL('image/jpeg', 0.92); } catch(e) { dataUrl = null; }
      RC[hexColor] = dataUrl;
      callback(dataUrl);
    };
    img.onerror = () => callback(null);
    img.src = 'assets/img/shirt-product.jpg';
  }

  /* ══════════════════════════════════════
     SHIRT DISPLAY
  ══════════════════════════════════════ */
  function isCamiseta() { return S.piece === 'camiseta'; }

  function setShirt() {
    const imgEl = document.getElementById('shirtImg');
    document.getElementById('shirtColorOverlay').style.backgroundColor = 'transparent';

    if (isCamiseta()) {
      if (S.view === 'flat') {
        /* Ghost mannequin + pixel recoloring */
        recolorShirt(S.color, function (dataUrl) {
          imgEl.src = dataUrl || 'assets/img/shirt-product.jpg';
        });
        /* Show original immediately while recolor processes */
        if (!imgEl.src || imgEl.src.endsWith('shirt-product.jpg')) {
          imgEl.src = 'assets/img/shirt-product.jpg';
        }
      } else {
        const map = { model: 'assets/img/shirt-model.jpg', 'model-f': 'assets/img/shirt-white.jpg' };
        imgEl.src = map[S.view] || map.model;
      }
      imgEl.onerror = function () {
        imgEl.src = svgUrl(S.color, S.piece, S.fit);
        imgEl.onerror = null;
      };
    } else {
      /* Regata / Moletom → SVG */
      imgEl.src = svgUrl(S.color, S.piece, S.fit);
    }

    setTimeout(addPrintGuide, 120);
  }

  /* ══════════════════════════════════════
     SVG BUILDER  (regata / moletom)
  ══════════════════════════════════════ */
  function lum(hex) {
    const c = hex.replace('#','');
    return 0.2126*parseInt(c.slice(0,2),16)/255
          +0.7152*parseInt(c.slice(2,4),16)/255
          +0.0722*parseInt(c.slice(4,6),16)/255;
  }

  function svgUrl(fill, piece, fit) {
    piece = piece || 'camiseta';
    fit   = fit   || 'regular';
    const dark = lum(fill) < 0.35;
    const seam = dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
    const col  = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.13)';
    const d    = (PATHS[piece] && PATHS[piece][fit]) || PATHS.regata.regular;

    const hood = piece === 'moletom' ? `
      <ellipse cx="250" cy="46" rx="73" ry="46" fill="${fill}"/>
      <ellipse cx="250" cy="54" rx="42" ry="26" fill="${dark?'#141414':'#e4e4e4'}" opacity="0.45"/>
      <path d="M183,80 C195,72 222,60 250,56 C278,60 305,72 317,80" fill="none" stroke="${seam}" stroke-width="1.5"/>` : '';

    /* Regata: realistic neckline details */
    const regataDetail = piece === 'regata' ? `
      <path d="M200,30 C218,55 235,76 250,82 C265,76 282,55 300,30"
        fill="none" stroke="${col}" stroke-width="1.8"/>
      <path d="M200,30 C210,36 230,42 250,44 C270,42 290,36 300,30"
        fill="none" stroke="${col}" stroke-width="0.8" opacity="0.5"/>` : '';

    const tagY = piece === 'moletom' ? 150 : (piece === 'regata' ? 125 : 110);
    const tag  = `<rect x="236" y="${tagY}" width="28" height="15" rx="2" fill="none" stroke="${seam}" stroke-width="0.9"/>
      <text x="250" y="${tagY+10.5}" text-anchor="middle" font-family="Arial,sans-serif" font-size="5.2" fill="${seam}">G&amp;S</text>`;

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 540" width="500" height="540">
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,0.07)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0.07)"/>
          </linearGradient>
        </defs>
        ${hood}
        <path d="${d}" fill="rgba(0,0,0,0.18)" transform="translate(0 7)"/>
        <path d="${d}" fill="${fill}"/>
        <path d="${d}" fill="url(#hg)"/>
        <path d="${d}" fill="none" stroke="${seam}" stroke-width="0.9"/>
        ${regataDetail}${tag}
      </svg>`
    );
  }

  /* ══════════════════════════════════════
     PRINT GUIDE
  ══════════════════════════════════════ */
  function pr() {
    if (isCamiseta()) return (PRINT[S.view] || PRINT.flat)[S.fit] || PRINT.flat.regular;
    const svgAreas = PRINT[S.piece] || PRINT.regata;
    return svgAreas[S.fit] || svgAreas.regular;
  }

  function removePrintGuide() {
    S.canvas.getObjects().filter(o => o.name === 'printGuide').forEach(o => S.canvas.remove(o));
  }

  function addPrintGuide() {
    removePrintGuide();
    const { x, y, w, h } = pr();
    const dark   = lum(S.color) < 0.35 || S.view !== 'flat';
    const stroke = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.30)';

    S.canvas.add(new fabric.Rect({
      left:x, top:y, width:w, height:h,
      fill:'transparent', stroke, strokeDashArray:[5,4], strokeWidth:1.5,
      selectable:false, evented:false, hoverCursor:'default',
      name:'printGuide', excludeFromExport:true
    }));

    const lbl = document.getElementById('printLabel');
    if (lbl) { lbl.style.left=x+'px'; lbl.style.top=(y+h+4)+'px'; lbl.style.width=w+'px'; lbl.style.color=stroke; }
  }

  /* ══════════════════════════════════════
     ZOOM
  ══════════════════════════════════════ */
  const ZOOM_MIN = 0.7, ZOOM_MAX = 4.0, ZOOM_STEP = 0.3;

  function applyZoom(level, px, py) {
    level = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, level));
    S.zoom = level;
    const pt = new fabric.Point(
      px !== undefined ? px : CW / 2,
      py !== undefined ? py : CH / 2
    );
    S.canvas.zoomToPoint(pt, level);
    document.getElementById('zoomLabel').textContent = Math.round(level * 100) + '%';
    document.getElementById('btnZoomOut').disabled = level <= ZOOM_MIN;
    document.getElementById('btnZoomIn').disabled  = level >= ZOOM_MAX;
  }

  function resetZoom() {
    S.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    S.zoom = 1;
    document.getElementById('zoomLabel').textContent = '100%';
    document.getElementById('btnZoomOut').disabled = false;
    document.getElementById('btnZoomIn').disabled  = false;
  }

  /* ══════════════════════════════════════
     CUSTOM DELETE CONTROL  (red × on object)
  ══════════════════════════════════════ */
  function setupControls() {
    fabric.Object.prototype.controls.deleteBtn = new fabric.Control({
      x: 0.5, y: -0.5, offsetX: 14, offsetY: -14,
      cursorStyle: 'pointer',
      mouseUpHandler: function (_e, t) {
        const cv = t.target.canvas;
        cv.remove(t.target); cv.discardActiveObject(); cv.requestRenderAll();
        saveHistory(); onSelectionChange(); return true;
      },
      render: function (ctx, left, top, _s, obj) {
        const r = 11;
        ctx.save(); ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(obj.angle||0));
        ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
        ctx.fillStyle='#ff3b30'; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1; ctx.stroke();
        const s=4.5; ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-s,-s); ctx.lineTo(s,s); ctx.moveTo(s,-s); ctx.lineTo(-s,s); ctx.stroke();
        ctx.restore();
      }
    });
  }

  /* ══════════════════════════════════════
     HISTORY
  ══════════════════════════════════════ */
  function saveHistory() {
    const objs = S.canvas.getObjects().filter(o=>!o.excludeFromExport).map(o=>o.toJSON(['name']));
    S.history.splice(S.hIdx+1);
    if (S.history.length>30) S.history.shift();
    S.history.push(JSON.stringify(objs));
    S.hIdx = S.history.length-1;
    refreshHistBtns();
  }
  function restoreHistory(idx) {
    S.canvas.getObjects().filter(o=>!o.excludeFromExport).forEach(o=>S.canvas.remove(o));
    fabric.util.enlivenObjects(JSON.parse(S.history[idx]), function(objs) {
      objs.forEach(o=>S.canvas.add(o));
      S.canvas.discardActiveObject(); addPrintGuide(); S.canvas.renderAll();
    });
  }
  function undo() { if(S.hIdx>0)                   { S.hIdx--; restoreHistory(S.hIdx); refreshHistBtns(); } }
  function redo() { if(S.hIdx<S.history.length-1) { S.hIdx++; restoreHistory(S.hIdx); refreshHistBtns(); } }
  function refreshHistBtns() {
    document.getElementById('btnUndo').disabled = S.hIdx<=0;
    document.getElementById('btnRedo').disabled = S.hIdx>=S.history.length-1;
  }

  /* ══════════════════════════════════════
     TEXT
  ══════════════════════════════════════ */
  function addText() {
    const { x, y, w, h } = pr();
    const dark = lum(S.color)<0.35 || S.view!=='flat';
    const txt = new fabric.IText('Seu texto aqui', {
      left:x+w/2, top:y+h/2, originX:'center', originY:'center',
      fontFamily:'Montserrat', fontSize:22,
      fill: dark?'#ffffff':'#111111',
      textAlign:'center', fontWeight:'normal',
      cornerColor:'#c9a84c', cornerStrokeColor:'#c9a84c',
      cornerSize:8, transparentCorners:false,
      borderColor:'rgba(201,168,76,0.7)', name:'userText'
    });
    S.canvas.add(txt); S.canvas.setActiveObject(txt);
    txt.enterEditing(); txt.selectAll(); S.canvas.renderAll(); saveHistory();
  }

  function syncText(obj) {
    if (!obj || obj.type!=='i-text') return;
    document.getElementById('fontFamily').value = obj.fontFamily||'Montserrat';
    document.getElementById('fontSize').value   = Math.round(obj.fontSize||22);
    document.getElementById('textColor').value  = obj.fill||'#ffffff';
    tog('btnBold',      obj.fontWeight==='bold');
    tog('btnItalic',    obj.fontStyle==='italic');
    tog('btnUnderline', !!obj.underline);
    document.querySelectorAll('.tc-swatch').forEach(s=>s.classList.toggle('active',s.dataset.color===obj.fill));
    document.querySelectorAll('[data-align]').forEach(b=>b.classList.toggle('active-align',b.dataset.align===(obj.textAlign||'center')));
  }
  function tog(id,on) { const el=document.getElementById(id); if(el)el.classList.toggle('active',on); }

  /* ══════════════════════════════════════
     IMAGE
  ══════════════════════════════════════ */
  function addImage(file) {
    if (!file||!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      /* No crossOrigin on data URLs — avoids canvas taint */
      fabric.Image.fromURL(e.target.result, function(img) {
        const {x,y,w,h} = pr();
        const scale = Math.min((w*0.88)/img.width, (h*0.88)/img.height);
        img.set({
          left:x+w/2, top:y+h/2, originX:'center', originY:'center',
          scaleX:scale, scaleY:scale,
          cornerColor:'#c9a84c', cornerStrokeColor:'#c9a84c',
          cornerSize:8, transparentCorners:false,
          borderColor:'rgba(201,168,76,0.7)', name:'userImage'
        });
        S.canvas.add(img); S.canvas.setActiveObject(img); S.canvas.renderAll(); saveHistory();
      });
    };
    reader.readAsDataURL(file);
  }

  /* ══════════════════════════════════════
     TEMPLATES
  ══════════════════════════════════════ */
  function applyTemplate(n) {
    const {x,y,w,h} = pr();
    const dark = lum(S.color)<0.35 || S.view!=='flat';
    const fill = dark?'#ffffff':'#111111';
    const cx = x+w/2;
    const base = {
      originX:'center', fontFamily:'Montserrat', textAlign:'center',
      cornerColor:'#c9a84c', cornerStrokeColor:'#c9a84c',
      cornerSize:8, transparentCorners:false, borderColor:'rgba(201,168,76,0.7)', name:'userText'
    };
    const sets = {
      1:[{text:'MINHA',top:y+50,fontSize:30,fontWeight:'900',charSpacing:80},{text:'MARCA',top:y+90,fontSize:30,fontWeight:'900',charSpacing:80}],
      2:[{text:'EST. 2024',top:y+54,fontSize:11,fontWeight:'600',charSpacing:60,opacity:0.65},{text:'BRAND',top:y+76,fontSize:34,fontWeight:'900',charSpacing:20}],
      3:[{text:'LIMITED\nEDITION',top:y+62,fontSize:20,fontWeight:'800',charSpacing:30,lineHeight:1.4}],
      4:[{text:'ORIGINAL',top:y+56,fontSize:28,fontWeight:'900',fontStyle:'italic',charSpacing:10},{text:'COLLECTION',top:y+98,fontSize:10,fontWeight:'600',charSpacing:60,opacity:0.55}]
    };
    (sets[n]||[]).forEach(cfg=>S.canvas.add(new fabric.IText(cfg.text,{...base,left:cx,fill,...cfg})));
    S.canvas.renderAll(); saveHistory();
  }

  /* ══════════════════════════════════════
     SELECTION
  ══════════════════════════════════════ */
  function onSelectionChange() {
    const obj=S.canvas.getActiveObject(), isT=obj&&obj.type==='i-text', isI=obj&&obj.type==='image';
    document.getElementById('textProps').classList.toggle('visible',isT);
    document.getElementById('imgProps').classList.toggle('visible',isI);
    document.getElementById('btnDelete').disabled=!obj;
    if(isT)syncText(obj);
    if(isI)document.getElementById('imgOpacity').value=obj.opacity??1;
  }

  function deleteSelected() {
    const obj=S.canvas.getActiveObject();
    if(!obj||obj.excludeFromExport)return;
    S.canvas.remove(obj); S.canvas.discardActiveObject(); S.canvas.renderAll(); saveHistory();
    document.getElementById('btnDelete').disabled=true;
    document.getElementById('textProps').classList.remove('visible');
    document.getElementById('imgProps').classList.remove('visible');
  }

  /* ══════════════════════════════════════
     EXPORT  — robust composite
     Wraps every canvas operation in try-catch
     so SecurityError from file:// never swallows the export.
  ══════════════════════════════════════ */
  function finalizar() {
    removePrintGuide();
    S.canvas.discardActiveObject();
    /* Temporarily reset zoom for clean export */
    const savedVP = S.canvas.viewportTransform.slice();
    S.canvas.setViewportTransform([1,0,0,1,0,0]);
    S.canvas.renderAll();

    /* 1. Export fabric objects */
    let fabricDataUrl = null;
    try { fabricDataUrl = S.canvas.toDataURL({ format:'png', multiplier:2 }); } catch(e) { console.warn('fabric toDataURL:',e); }

    /* Restore zoom */
    S.canvas.setViewportTransform(savedVP);
    addPrintGuide();
    S.canvas.renderAll();

    const shirtEl = document.getElementById('shirtImg');

    function compose() {
      const off = document.createElement('canvas');
      off.width  = CW*2; off.height = CH*2;
      const ctx  = off.getContext('2d');

      /* 2. Draw shirt */
      try { ctx.drawImage(shirtEl, 0, 0, off.width, off.height); } catch(e) {
        /* Fallback: solid color block */
        ctx.fillStyle = S.color;
        ctx.fillRect(0, 0, off.width, off.height);
      }

      /* 3. Overlay fabric objects */
      function finish() {
        let finalUrl = null;
        try { finalUrl = off.toDataURL('image/png'); } catch(e) {
          /* Canvas tainted (file:// CORS) — use fabric-only fallback */
          finalUrl = fabricDataUrl;
        }
        if (!finalUrl) {
          alert('Erro ao exportar. Abra o arquivo em um servidor local (ex: Live Server no VS Code).');
          return;
        }
        S.exportUrl = finalUrl;
        try { doDownload(finalUrl); } catch(e) { console.warn('download blocked:', e); }
        document.getElementById('previewImg').src = finalUrl;
        document.getElementById('resumoPeca').textContent    = capitalize(S.piece);
        document.getElementById('resumoFit').textContent     = {regular:'Regular',slim:'Slim Fit',oversize:'Oversize'}[S.fit]||S.fit;
        document.getElementById('resumoTamanho').textContent = S.size;
        document.getElementById('resumoCor').textContent     = S.colorName;
        openModal('modalFinalizar');
      }

      if (fabricDataUrl) {
        const fi = new Image();
        fi.onload  = function() { try{ ctx.drawImage(fi,0,0); }catch(e){} finish(); };
        fi.onerror = finish;
        fi.src = fabricDataUrl;
      } else { finish(); }
    }

    /* Wait for shirt image if needed.
       Check only .complete — covers both success (naturalWidth>0) and
       error state (naturalWidth=0). Without this, a failed image load
       leaves compose() waiting for events that never fire. */
    if (shirtEl.complete) {
      compose();
    } else if (shirtEl.src) {
      let done = false;
      const once = () => { if (!done) { done = true; compose(); } };
      shirtEl.addEventListener('load',  once, { once: true });
      shirtEl.addEventListener('error', once, { once: true });
      /* Safety fallback: if neither event fires within 3s, proceed anyway */
      setTimeout(once, 3000);
    } else {
      compose();
    }
  }

  function doDownload(dataUrl) {
    const a = document.createElement('a');
    a.download = `camiseta-gs-${S.fit}-${S.size}-${S.colorName.replace(/\s/g,'-')}.png`;
    a.href = dataUrl; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function openWhatsApp() {
    const msg=['Olá! Gostaria de solicitar orçamento para uma peça personalizada pela Gordon & Smith.','',
      `Peça: ${{camiseta:'Camiseta',regata:'Regata',moletom:'Moletom'}[S.piece]}`,
      `Fit: ${{regular:'Regular',slim:'Slim Fit',oversize:'Oversize'}[S.fit]}`,
      `Tamanho: ${S.size}`,`Cor: ${S.colorName}`,'','Estou enviando o design em anexo. Aguardo retorno!'].join('\n');
    window.open('https://wa.me/5511997380386?text='+encodeURIComponent(msg),'_blank');
  }

  function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
  function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
  function capitalize(s)  { return s.charAt(0).toUpperCase()+s.slice(1); }

  /* ══════════════════════════════════════
     BIND EVENTS
  ══════════════════════════════════════ */
  function bindEvents() {
    const cv = S.canvas;

    cv.on('object:modified',   saveHistory);
    cv.on('selection:created', onSelectionChange);
    cv.on('selection:updated', onSelectionChange);
    cv.on('selection:cleared', onSelectionChange);
    cv.on('text:changed', () => { const o=cv.getActiveObject(); if(o&&o.type==='i-text')syncText(o); });

    /* Mouse-wheel zoom */
    cv.on('mouse:wheel', function(opt) {
      opt.e.preventDefault(); opt.e.stopPropagation();
      const delta = opt.e.deltaY;
      const next  = S.canvas.getZoom() * (delta>0 ? 0.93 : 1.08);
      applyZoom(next, opt.e.offsetX, opt.e.offsetY);
    });

    /* Zoom buttons */
    document.getElementById('btnZoomIn').addEventListener('click',    ()=>applyZoom(S.zoom+ZOOM_STEP));
    document.getElementById('btnZoomOut').addEventListener('click',   ()=>applyZoom(S.zoom-ZOOM_STEP));
    document.getElementById('btnZoomReset').addEventListener('click', resetZoom);

    /* Tool tabs */
    document.querySelectorAll('.tool-tab').forEach(btn=>{
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tool-tab').forEach(b=>b.classList.remove('active'));
        document.querySelectorAll('.tool-panel').forEach(p=>p.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('panel-'+this.dataset.tab).classList.add('active');
      });
    });

    document.getElementById('btnAddText').addEventListener('click', addText);

    document.getElementById('fontFamily').addEventListener('change', function() {
      const o=cv.getActiveObject(); if(o&&o.type==='i-text'){o.set('fontFamily',this.value);cv.renderAll();saveHistory();}
    });
    document.getElementById('fontSize').addEventListener('change', function() {
      const o=cv.getActiveObject(), sz=parseInt(this.value,10);
      if(o&&o.type==='i-text'&&sz>4&&sz<200){o.set('fontSize',sz);cv.renderAll();saveHistory();}
    });
    document.querySelectorAll('.size-btn').forEach(btn=>{
      btn.addEventListener('click',function(){
        const o=cv.getActiveObject(); if(!o||o.type!=='i-text')return;
        const sz=Math.max(8,Math.min(140,(o.fontSize||22)+(this.dataset.action==='sizeUp'?2:-2)));
        o.set('fontSize',sz); document.getElementById('fontSize').value=sz; cv.renderAll(); saveHistory();
      });
    });

    document.getElementById('btnBold').addEventListener('click',function(){
      const o=cv.getActiveObject(); if(!o||o.type!=='i-text')return;
      const on=o.fontWeight!=='bold'; o.set('fontWeight',on?'bold':'normal'); this.classList.toggle('active',on); cv.renderAll();saveHistory();
    });
    document.getElementById('btnItalic').addEventListener('click',function(){
      const o=cv.getActiveObject(); if(!o||o.type!=='i-text')return;
      const on=o.fontStyle!=='italic'; o.set('fontStyle',on?'italic':'normal'); this.classList.toggle('active',on); cv.renderAll();saveHistory();
    });
    document.getElementById('btnUnderline').addEventListener('click',function(){
      const o=cv.getActiveObject(); if(!o||o.type!=='i-text')return;
      o.set('underline',!o.underline); this.classList.toggle('active',o.underline); cv.renderAll();saveHistory();
    });

    document.querySelectorAll('[data-align]').forEach(btn=>{
      btn.addEventListener('click',function(){
        const o=cv.getActiveObject(); if(!o||o.type!=='i-text')return;
        o.set('textAlign',this.dataset.align);
        document.querySelectorAll('[data-align]').forEach(b=>b.classList.remove('active-align'));
        this.classList.add('active-align'); cv.renderAll();saveHistory();
      });
    });

    document.getElementById('textColor').addEventListener('input',function(){
      const o=cv.getActiveObject(); if(o&&o.type==='i-text'){o.set('fill',this.value);cv.renderAll();}
    });
    document.getElementById('textColor').addEventListener('change',()=>{saveHistory();document.querySelectorAll('.tc-swatch').forEach(s=>s.classList.remove('active'));});
    document.querySelectorAll('.tc-swatch').forEach(sw=>{
      sw.addEventListener('click',function(){
        const o=cv.getActiveObject(), col=this.dataset.color;
        if(o&&o.type==='i-text'){o.set('fill',col);cv.renderAll();saveHistory();}
        document.getElementById('textColor').value=col;
        document.querySelectorAll('.tc-swatch').forEach(s=>s.classList.remove('active')); this.classList.add('active');
      });
    });

    const fi=document.getElementById('fileInput'), ua=document.getElementById('uploadArea');
    document.getElementById('btnChooseImg').addEventListener('click',e=>{e.stopPropagation();fi.click();});
    fi.addEventListener('change',function(){if(this.files[0]){addImage(this.files[0]);this.value='';}});
    ua.addEventListener('click',()=>fi.click());
    ua.addEventListener('dragover',e=>{e.preventDefault();ua.classList.add('dragover');});
    ua.addEventListener('dragleave',()=>ua.classList.remove('dragover'));
    ua.addEventListener('drop',e=>{e.preventDefault();ua.classList.remove('dragover');if(e.dataTransfer.files[0])addImage(e.dataTransfer.files[0]);});

    document.getElementById('imgOpacity').addEventListener('input',function(){const o=cv.getActiveObject();if(o&&o.type==='image'){o.set('opacity',parseFloat(this.value));cv.renderAll();}});
    document.getElementById('imgOpacity').addEventListener('change',saveHistory);
    document.getElementById('btnFlipH').addEventListener('click',()=>{const o=cv.getActiveObject();if(o&&o.type==='image'){o.set('flipX',!o.flipX);cv.renderAll();saveHistory();}});
    document.getElementById('btnFlipV').addEventListener('click',()=>{const o=cv.getActiveObject();if(o&&o.type==='image'){o.set('flipY',!o.flipY);cv.renderAll();saveHistory();}});

    document.querySelectorAll('.tpl-btn').forEach(btn=>{btn.addEventListener('click',function(){applyTemplate(+this.dataset.tpl);});});

    /* Shirt colors (optional — elements may not be present) */
    document.querySelectorAll('.shirt-color').forEach(btn=>{
      btn.addEventListener('click',function(){
        document.querySelectorAll('.shirt-color').forEach(b=>b.classList.remove('active'));
        this.classList.add('active'); S.color=this.dataset.color; S.colorName=this.dataset.name;
        const lbl=document.getElementById('colorNameLabel'); if(lbl)lbl.textContent=S.colorName;
        setShirt();
      });
    });

    /* Size (optional) */
    document.querySelectorAll('.size-opt').forEach(btn=>{
      btn.addEventListener('click',function(){
        document.querySelectorAll('.size-opt').forEach(b=>b.classList.remove('active'));
        this.classList.add('active'); S.size=this.dataset.size;
      });
    });

    /* Fit (optional) */
    document.querySelectorAll('.fit-opt').forEach(btn=>{
      btn.addEventListener('click',function(){
        document.querySelectorAll('.fit-opt').forEach(b=>b.classList.remove('active'));
        this.classList.add('active'); S.fit=this.dataset.fit; setShirt();
      });
    });

    /* View toggle */
    document.querySelectorAll('.view-btn').forEach(btn=>{
      btn.addEventListener('click',function(){
        document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active'));
        this.classList.add('active'); S.view=this.dataset.view; setShirt();
      });
    });

    document.getElementById('btnUndo').addEventListener('click',undo);
    document.getElementById('btnRedo').addEventListener('click',redo);
    document.getElementById('btnDelete').addEventListener('click',deleteSelected);

    document.addEventListener('keydown',function(e){
      const editing=cv.getActiveObject()&&cv.getActiveObject().isEditing;
      if(!editing){
        if(e.key==='Delete'||e.key==='Backspace')deleteSelected();
        if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}
        if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==='y'||(e.shiftKey&&e.key.toLowerCase()==='z'))){e.preventDefault();redo();}
        if(e.key==='='||e.key==='+')applyZoom(S.zoom+ZOOM_STEP);
        if(e.key==='-')applyZoom(S.zoom-ZOOM_STEP);
        if(e.key==='0')resetZoom();
      }
    });

    document.getElementById('btnFinalizar').addEventListener('click', finalizar);
    document.getElementById('btnWhatsApp').addEventListener('click', openWhatsApp);
    document.getElementById('btnDownloadAgain').addEventListener('click',()=>{if(S.exportUrl)doDownload(S.exportUrl);});
    document.getElementById('closeFinalizarModal').addEventListener('click',()=>closeModal('modalFinalizar'));

    /* Mudar Peça (optional — button removed from UI for now) */
    const btnMP=document.getElementById('btnMudarPeca');
    if(btnMP) btnMP.addEventListener('click',()=>openModal('modalPeca'));
    const closePeca=document.getElementById('closePecaModal');
    if(closePeca) closePeca.addEventListener('click',()=>closeModal('modalPeca'));
    document.querySelectorAll('.peca-btn').forEach(btn=>{
      btn.addEventListener('click',function(){
        document.querySelectorAll('.peca-btn').forEach(b=>b.classList.remove('active'));
        this.classList.add('active'); S.piece=this.dataset.peca;
        const h2=document.querySelector('.prod-header h2');
        if(h2){const labels={camiseta:'Camiseta Personalizada<br>Faca Vc',regata:'Regata Personalizada<br>Faca Vc',moletom:'Moletom Personalizado<br>Faca Vc'};h2.innerHTML=labels[S.piece]||labels.camiseta;}
        setShirt(); closeModal('modalPeca');
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(ov=>{
      ov.addEventListener('click',function(e){if(e.target===this)closeModal(this.id);});
    });
    document.querySelectorAll('.prod-tab').forEach(btn=>{
      btn.addEventListener('click',function(){
        document.querySelectorAll('.prod-tab').forEach(b=>b.classList.remove('active'));
        document.querySelectorAll('.prod-tab-body').forEach(p=>p.classList.add('hidden'));
        this.classList.add('active'); document.getElementById('ptab-'+this.dataset.ptab).classList.remove('hidden');
      });
    });
  }

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  function init() {
    setupControls();

    S.canvas = new fabric.Canvas('fabricCanvas', {
      width:CW, height:CH, backgroundColor:null, preserveObjectStacking:true
    });

    /* Pre-warm recolor cache for black (most common) */
    recolorShirt('#1a1a1a', ()=>{});

    setShirt();

    setTimeout(function() {
      addPrintGuide(); saveHistory(); refreshHistBtns();
    }, 350);

    bindEvents();
  }

  if (document.fonts&&document.fonts.ready) document.fonts.ready.then(init);
  else window.addEventListener('load', init);

})();
