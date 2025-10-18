/* ui.js
   Responsibility: manage the entire UI: rendering grid, palette, layers, tools, interactions, and export.
   Defines: window.App.init and window.App.render
*/
(function(window, $){
  window.App = window.App || {};

  // App state container
  const State = {
    project: null,
    tool: 'pencil',
    pointerDown: false,
    lastPos: null
  };

  // Save helpers
  function persist(){
    try{ window.App.Storage.save(State.project); } catch(e){console.error(e);}  
  }

  // Create DOM grid based on project size and scale
  function buildGrid(){
    const $grid = $('#pixel-grid');
    const size = State.project.size;
    const scale = parseInt(State.project.scale,10) || 12;
    const total = size * size;

    $grid.empty();
    $grid.css({
      'grid-template-columns': `repeat(${size}, ${scale}px)`,
      'grid-template-rows': `repeat(${size}, ${scale}px)`
    });

    for(let i=0;i<total;i++){
      const cell = $(`<div tabindex="0" class="pixel-cell" data-index="${i}" role="button" aria-label="pixel"></div>`);
      cell.css({width: scale+'px', height: scale+'px'});
      $grid.append(cell);
    }

    renderGrid();
  }

  // Composite layers and apply to DOM cells
  function renderGrid(){
    const size = State.project.size;
    const total = size * size;
    const cells = $('#pixel-grid .pixel-cell');

    // compute final color for each pixel by checking layers bottom to top
    for(let i=0;i<total;i++){
      let color = null;
      for(let li=0; li<State.project.layers.length; li++){
        const layer = State.project.layers[li];
        if (!layer.visible) continue;
        const px = layer.pixels[i];
        if (px !== null && px !== undefined){ color = px; }
      }
      const $c = $(cells.get(i));
      $c.css('background-color', color || 'transparent');
    }
  }

  // Draw to currently active layer
  function paintAt(index, color){
    const layer = State.project.layers[State.project.layers.length-1 - State.project.activeLayerIndex];
    if (!layer) return;
    const prev = layer.pixels[index];
    if (prev === color) return;
    // push history (simple)
    State.project.history.push({layerId: layer.id, index: index, prev: prev});
    layer.pixels[index] = color;
    persist();
    renderGrid();
  }

  // Erase
  function eraseAt(index){
    const layer = State.project.layers[State.project.layers.length-1 - State.project.activeLayerIndex];
    if (!layer) return;
    const prev = layer.pixels[index];
    if (prev === null) return;
    State.project.history.push({layerId: layer.id, index: index, prev: prev});
    layer.pixels[index] = null;
    persist();
    renderGrid();
  }

  // Fill (flood fill) on active layer
  function floodFill(index, color){
    const size = State.project.size;
    const layer = State.project.layers[State.project.layers.length-1 - State.project.activeLayerIndex];
    if (!layer) return;
    const target = layer.pixels[index];
    if (target === color) return;
    const stack = [index];
    const visited = {};
    while(stack.length){
      const idx = stack.pop();
      if (visited[idx]) continue;
      visited[idx] = true;
      if (layer.pixels[idx] !== target) continue;
      // set
      State.project.history.push({layerId: layer.id, index: idx, prev: layer.pixels[idx]});
      layer.pixels[idx] = color;
      const x = idx % size;
      const y = Math.floor(idx/size);
      // neighbors
      const neighbors = [];
      if (x>0) neighbors.push(idx-1);
      if (x < size-1) neighbors.push(idx+1);
      if (y>0) neighbors.push(idx-size);
      if (y < size-1) neighbors.push(idx+size);
      neighbors.forEach(n => { if (!visited[n]) stack.push(n); });
    }
    persist();
    renderGrid();
  }

  // set up palette UI
  function renderPalette(){
    const $pal = $('#palette');
    $pal.empty();
    State.project.palette.forEach((c, i)=>{
      const sw = $(`<button class="w-8 h-8 rounded-sm border border-slate-100" data-color="${c}" title="${c}"></button>`);
      sw.css('background-color', c);
      if (c === State.project.activeColor) sw.css('outline','3px solid var(--accent-primary-ring)');
      $pal.append(sw);
    });
  }

  // layers UI - topmost layer is visually first in UI; state holds array bottom->top, but we'll render top->bottom
  function renderLayers(){
    const $container = $('#layers');
    $container.empty();
    // store activeLayerIndex in project for reference; default 0 is topmost
    if (State.project.activeLayerIndex === undefined) State.project.activeLayerIndex = 0;

    // render from top to bottom so UI order matches visual stacking
    for(let i = State.project.layers.length-1; i>=0; i--){
      const layer = State.project.layers[i];
      const $tpl = $($('#layer-item-template').html());
      $tpl.find('.layer-name').val(layer.name).attr('data-layer-id', layer.id);
      $tpl.find('.layer-vis').attr('aria-pressed', layer.visible ? 'true' : 'false');
      // attach actions
      $tpl.data('layer-index', i);
      $container.append($tpl);
    }
    // attach events after DOM created
    $('#layers .layer-vis').off('click').on('click', function(){
      const idx = $(this).closest('[data-layer-id]').length ? null : $(this).closest('div').data('layer-index');
      const li = $(this).closest('div').data('layer-index');
      const layer = State.project.layers[li];
      layer.visible = !layer.visible;
      persist();
      renderLayers();
      renderGrid();
    });

    $('#layers .layer-delete').off('click').on('click', function(){
      const li = $(this).closest('div').data('layer-index');
      if (State.project.layers.length === 1){ alert('At least one layer is required.'); return; }
      State.project.layers.splice(li,1);
      persist();
      renderLayers();
      renderGrid();
    });

    $('#layers .layer-up').off('click').on('click', function(){
      const li = $(this).closest('div').data('layer-index');
      if (li <= 0) return; // topmost in array is bottom visually
      const a = State.project.layers.splice(li,1)[0];
      State.project.layers.splice(li-1,0,a);
      persist(); renderLayers(); renderGrid();
    });

    $('#layers .layer-down').off('click').on('click', function(){
      const li = $(this).closest('div').data('layer-index');
      if (li >= State.project.layers.length-1) return;
      const a = State.project.layers.splice(li,1)[0];
      State.project.layers.splice(li+1,0,a);
      persist(); renderLayers(); renderGrid();
    });

    $('#layers .layer-name').off('change').on('change', function(){
      const li = $(this).closest('div').data('layer-index');
      State.project.layers[li].name = $(this).val();
      persist(); renderLayers();
    });
  }

  // Utility: find top-most active layer index mapping
  function ensureActiveLayerIndex(){
    if (State.project.activeLayerIndex === undefined) State.project.activeLayerIndex = 0;
    // keep within bounds
    State.project.activeLayerIndex = window.App.Utils.clamp(State.project.activeLayerIndex, 0, State.project.layers.length-1);
  }

  // Export PNG by composing layers into an offscreen canvas and preparing a download
  function exportPNG(){
    const size = State.project.size;
    const scale = parseInt($('#export-scale').val(),10) || 2;
    const filename = $('#export-name').val() || 'pixel-art.png';
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');

    // clear
    ctx.clearRect(0,0,canvas.width, canvas.height);

    // compose layers bottom to top
    for(let i=0;i<State.project.layers.length;i++){
      const layer = State.project.layers[i];
      if (!layer.visible) continue;
      for(let p=0;p<layer.pixels.length;p++){
        const color = layer.pixels[p];
        if (!color) continue;
        const x = p % size;
        const y = Math.floor(p/size);
        ctx.fillStyle = color;
        ctx.fillRect(x*scale, y*scale, scale, scale);
      }
    }

    // prepare download
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // clear active layer
  function clearActiveLayer(){
    const layer = State.project.layers[State.project.layers.length-1 - State.project.activeLayerIndex];
    for(let i=0;i<layer.pixels.length;i++) layer.pixels[i] = null;
    State.project.history.push({clearLayer: layer.id});
    persist(); renderGrid();
  }

  // Add layer on top
  function addLayer(){
    const size = State.project.size;
    const layer = window.App.Data ? window.App.Data.createEmptyLayer(size, `Layer ${State.project.layers.length+1}`) : { id: window.App.Utils.uid('layer'), name:'Layer', visible:true, pixels: new Array(size*size).fill(null) };
    State.project.layers.push(layer);
    persist(); renderLayers(); renderGrid();
  }

  // UI wiring
  function bindUI(){
    // grid interaction handlers
    const $grid = $('#pixel-grid');

    // pointer handling
    $grid.off('mousedown').on('mousedown', '.pixel-cell', function(e){
      e.preventDefault();
      State.pointerDown = true;
      const idx = parseInt($(this).attr('data-index'),10);
      handlePointerAction(idx, e);
    });

    $(document).off('mouseup').on('mouseup', function(){ State.pointerDown = false; State.lastPos = null; });

    $grid.off('mousemove').on('mousemove', '.pixel-cell', function(e){
      if (!State.pointerDown) return;
      const idx = parseInt($(this).attr('data-index'),10);
      handlePointerAction(idx, e);
    });

    // single-click pick
    $grid.off('click').on('click', '.pixel-cell', function(e){
      const idx = parseInt($(this).attr('data-index'),10);
      if (State.tool === 'picker'){
        // sample topmost visible color
        const color = sampleColorAt(idx);
        if (color) { State.project.activeColor = color; $('#color-picker').val(rgbToHex(color)); renderPalette(); }
      }
    });

    // tools
    $('#tool-pencil').on('click', function(){ setTool('pencil'); });
    $('#tool-eraser').on('click', function(){ setTool('eraser'); });
    $('#tool-fill').on('click', function(){ setTool('fill'); });
    $('#tool-picker').on('click', function(){ setTool('picker'); });

    // palette
    $('#palette').on('click','button', function(){
      const c = $(this).attr('data-color');
      State.project.activeColor = c; $('#color-picker').val(c); renderPalette(); persist();
    });
    $('#btn-add-color').on('click', function(){
      const picked = $('#color-picker').val();
      if (!State.project.palette.includes(picked)) State.project.palette.unshift(picked);
      State.project.activeColor = picked;
      renderPalette(); persist();
    });
    $('#color-picker').on('input', function(){ State.project.activeColor = $(this).val(); renderPalette(); });

    // grid size and scale
    $('#input-grid-size').on('change', function(){
      const size = parseInt($(this).val(),10);
      // rebuild project
      const p = window.App.Data.newProject(size);
      State.project.size = p.size; State.project.layers = p.layers; State.project.history = []; State.project.future = []; persist(); buildGrid(); renderLayers(); renderPalette();
    });
    $('#input-scale').on('input', function(){ State.project.scale = $(this).val(); $('#scale-label').text(State.project.scale + ' px'); buildGrid(); persist(); });

    // layer controls
    $('#btn-add-layer').on('click', addLayer);
    $('#btn-clear').on('click', function(){ if (confirm('Clear the active layer?')) clearActiveLayer(); });

    // export
    $('#btn-export').on('click', function(e){ e.preventDefault(); exportPNG(); });

    // new / save
    $('#btn-new').on('click', function(){ if (confirm('Start a new 32x32 project? Unsaved changes will be lost.')){ State.project = window.App.Data.newProject(32); persist(); buildGrid(); renderLayers(); renderPalette(); } });
    $('#btn-save').on('click', function(){ persist(); alert('Project saved to browser storage.'); });

    // undo / redo (simple)
    $('#btn-undo').on('click', function(){ const h = State.project.history.pop(); if (!h) return; // basic support for pixel edits
      if (h.clearLayer){ // revert clear - not supported fully
        // no-op
      } else {
        const li = stateLayerIndexById(h.layerId);
        if (li>=0) State.project.layers[li].pixels[h.index] = h.prev;
      }
      State.project.future.push(h); persist(); renderGrid();
    });
    $('#btn-redo').on('click', function(){ const f = State.project.future.pop(); if (!f) return; // not fully implemented
      persist(); renderGrid();
    });

    // keyboard accessibility: change tools with keys
    $(document).on('keydown', function(e){ if ($(e.target).is('input') || $(e.target).is('textarea')) return; if (e.key === 'p') setTool('pencil'); if (e.key==='e') setTool('eraser'); if (e.key==='f') setTool('fill'); if (e.key==='c') setTool('picker'); });
  }

  function stateLayerIndexById(id){ return State.project.layers.findIndex(l => l.id === id); }

  function handlePointerAction(index, e){
    ensureActiveLayerIndex();
    if (State.tool === 'pencil'){
      paintAt(index, State.project.activeColor);
    } else if (State.tool === 'eraser'){
      eraseAt(index);
    } else if (State.tool === 'fill'){
      floodFill(index, State.project.activeColor);
    } else if (State.tool === 'picker'){
      const color = sampleColorAt(index);
      if (color){ State.project.activeColor = rgbToHex(color); $('#color-picker').val(rgbToHex(color)); renderPalette(); }
    }
  }

  function sampleColorAt(index){
    // sample topmost visible pixel color
    for(let i=State.project.layers.length-1;i>=0;i--){
      const layer = State.project.layers[i];
      if (!layer.visible) continue;
      const c = layer.pixels[index];
      if (c) return c;
    }
    return null;
  }

  // convert rgb(a) or hex to hex string (only basic cases handled since we store hex)
  function rgbToHex(rgb){
    if (!rgb) return '#000000';
    if (rgb[0] === '#') return rgb;
    // handle rgb(255,255,255)
    const m = rgb.match(/rgba?\((\d+),(\d+),(\d+)/);
    if (!m) return '#000000';
    const r = parseInt(m[1],10).toString(16).padStart(2,'0');
    const g = parseInt(m[2],10).toString(16).padStart(2,'0');
    const b = parseInt(m[3],10).toString(16).padStart(2,'0');
    return `#${r}${g}${b}`;
  }

  function setTool(t){ State.tool = t; $('.tool').attr('aria-pressed','false'); $(`#tool-${t}`).attr('aria-pressed','true'); }

  // App public API
  function init(){
    // load project from storage or new project
    const loaded = window.App.Storage.load();
    if (loaded && loaded.size){
      State.project = loaded;
    } else {
      State.project = window.App.Data.newProject(32);
    }
    // default active layer index 0 means topmost
    State.project.activeLayerIndex = 0;

    // if helper functions not available, ensure presence
    if (!window.App.Utils) window.App.Utils = { clamp: (v)=>v, uid: ()=>('id-'+Date.now()) };

    // initialize UI values
    $('#input-grid-size').val(State.project.size);
    $('#input-scale').val(State.project.scale);
    $('#scale-label').text(State.project.scale + ' px');

    buildGrid();
    renderPalette();
    renderLayers();
    bindUI();

    // small accessibility: keyboard focusable pixels
    $(document).on('keydown', '#pixel-grid .pixel-cell', function(e){
      const idx = parseInt($(this).attr('data-index'),10);
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePointerAction(idx, {}); }
    });
  }

  function render(){
    renderGrid();
    renderPalette();
    renderLayers();
  }

  // attach to global App namespace
  window.App.init = init;
  window.App.render = render;

})(window, jQuery);
