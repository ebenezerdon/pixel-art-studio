/* helpers.js
   Responsibility: persistence and small utilities
   Expose: window.App = window.App || {}; window.App.Storage and window.App.Utils
*/
(function(window, $){
  window.App = window.App || {};

  const STORAGE_KEY = 'pixel-art-studio-v1';

  // Storage helpers that serialize and parse project data
  const Storage = {
    save(project){
      try{
        const payload = JSON.stringify(project);
        window.localStorage.setItem(STORAGE_KEY, payload);
        return true;
      } catch (e){
        console.error('Failed to save project', e);
        return false;
      }
    },
    load(){
      try{
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e){
        console.error('Failed to load project', e);
        return null;
      }
    },
    clear(){
      try{ window.localStorage.removeItem(STORAGE_KEY); } catch(e){console.warn(e);}    
    }
  };

  const Utils = {
    // clamp helper
    clamp(v,min,max){ return Math.max(min, Math.min(max, v)); },
    // deep clone simple objects
    clone(obj){ return JSON.parse(JSON.stringify(obj)); },
    uid(prefix){ return (prefix||'id') + '-' + Math.random().toString(36).slice(2,9); }
  };

  // attach to window.App namespace
  window.App.Storage = Storage;
  window.App.Utils = Utils;

})(window, jQuery);
