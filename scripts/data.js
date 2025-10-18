/* data.js
   Responsibility: provide default palette and a factory for new projects
   Expose on window.App.Data
*/
(function(window){
  window.App = window.App || {};

  const DEFAULT_PALETTE = [
    '#000000', '#ffffff', '#0a66c2', '#0077b5', '#004182', '#39a0ed', '#cfeefc', '#6b7280', '#94a3b8', '#e6f4ff'
  ];

  function createEmptyLayer(size, name){
    const pixels = new Array(size * size).fill(null); // null means transparent
    return {
      id: window.App.Utils ? window.App.Utils.uid('layer') : 'layer-1',
      name: name || 'Layer',
      visible: true,
      opacity: 1,
      pixels: pixels
    };
  }

  function newProject(size){
    const layers = [ createEmptyLayer(size, 'Layer 1') ];
    return {
      size: size,
      scale: 12,
      palette: DEFAULT_PALETTE.slice(),
      activeColor: DEFAULT_PALETTE[0],
      layers: layers,
      history: [],
      future: []
    };
  }

  window.App.Data = {
    defaultPalette: DEFAULT_PALETTE,
    newProject: newProject
  };

})(window);
