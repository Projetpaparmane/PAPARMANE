/*
 * Récréaction — mini moteur du prototype.
 * Chaque écran contient un gabarit (<template id="dc-template">) et sa logique
 * (<script type="text/x-dc" id="dc-logic">). Le moteur affiche le gabarit avec
 * les valeurs de renderVals() et le réaffiche à chaque setState().
 * Syntaxe prise en charge : {{chemin}}, <sc-for list as>, <sc-if value>, onClick / onChange.
 */
(function () {
  'use strict';

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var BOOL_ATTRS = { checked: 1, disabled: 1, selected: 1, readonly: 1, required: 1, hidden: 1, open: 1, multiple: 1 };
  var TEXT_INPUTS = { text: 1, search: 1, email: 1, tel: 1, url: 1, number: 1, password: 1 };

  var mount = null;
  var tpl = null;
  var comp = null;
  var pending = false;
  var fixedWidth = 0;

  function lookup(expr, scope) {
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    var parts = expr.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interpolate(str, scope) {
    return str.replace(HOLE, function (_, expr) {
      var v = lookup(expr, scope);
      return v == null ? '' : String(v);
    });
  }

  function holeOf(el, name, scope) {
    var m = (el.getAttribute(name) || '').match(WHOLE);
    return m ? lookup(m[1], scope) : undefined;
  }

  // onChange suit la logique de React : à chaque frappe pour les champs texte.
  function eventName(el, attr) {
    var name = attr.slice(2);
    if (name === 'change') {
      var tag = el.localName;
      var type = (el.getAttribute('type') || 'text').toLowerCase();
      if (tag === 'textarea' || (tag === 'input' && TEXT_INPUTS[type])) return 'input';
    }
    return name;
  }

  function applyAttributes(el, scope) {
    var attrs = Array.prototype.slice.call(el.attributes);
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i].name;
      var value = attrs[i].value;
      if (name.indexOf('hint-') === 0) {
        el.removeAttribute(name);
        continue;
      }
      if (value.indexOf('{{') === -1) continue;
      var whole = value.match(WHOLE);

      if (name.length > 2 && name.slice(0, 2) === 'on') {
        el.removeAttribute(name);
        var fn = whole ? lookup(whole[1], scope) : null;
        if (typeof fn === 'function') el.addEventListener(eventName(el, name), fn);
        continue;
      }

      if (!whole) {
        el.setAttribute(name, interpolate(value, scope));
        continue;
      }

      var raw = lookup(whole[1], scope);
      if (BOOL_ATTRS[name]) {
        if (raw) el.setAttribute(name, '');
        else el.removeAttribute(name);
        if (name === 'checked') el.checked = !!raw;
        if (name === 'disabled') el.disabled = !!raw;
        continue;
      }
      if (name === 'value') {
        var s = raw == null ? '' : String(raw);
        el.setAttribute('value', s);
        el.value = s;
        continue;
      }
      if (raw == null || raw === false) el.removeAttribute(name);
      else el.setAttribute(name, String(raw));
    }
  }

  function renderChildren(node, scope, parent) {
    for (var c = node.firstChild; c; c = c.nextSibling) renderInto(c, scope, parent);
  }

  function renderInto(node, scope, parent) {
    if (node.nodeType === 3) {
      var text = node.nodeValue;
      parent.appendChild(document.createTextNode(text.indexOf('{{') === -1 ? text : interpolate(text, scope)));
      return;
    }
    if (node.nodeType !== 1) return;

    var tag = node.localName;
    if (tag === 'sc-for') {
      var list = holeOf(node, 'list', scope);
      var as = node.getAttribute('as') || 'item';
      if (list && list.length) {
        for (var i = 0; i < list.length; i++) {
          var child = Object.create(scope);
          child[as] = list[i];
          child.$index = i;
          renderChildren(node, child, parent);
        }
      }
      return;
    }
    if (tag === 'sc-if') {
      if (holeOf(node, 'value', scope)) renderChildren(node, scope, parent);
      return;
    }

    var el = node.cloneNode(false);
    applyAttributes(el, scope);
    renderChildren(node, scope, el);
    parent.appendChild(el);
  }

  // Écrans à taille fixe (téléphone, courriel, télé) : réduits pour tenir dans la fenêtre.
  function fit() {
    var el = mount && mount.firstElementChild;
    if (!el || !fixedWidth) return;
    var margin = window.innerWidth > 600 ? 64 : 0;
    var scale = Math.min(1, (window.innerWidth - margin) / fixedWidth);
    el.style.zoom = scale < 1 ? String(Math.round(scale * 1000) / 1000) : '';
  }

  function render() {
    pending = false;
    var active = document.activeElement;
    var focusId = active && active.id && mount.contains(active) ? active.id : null;
    var range = null;
    if (focusId) {
      try { range = [active.selectionStart, active.selectionEnd]; } catch (e) { range = null; }
    }

    var vals = comp.renderVals() || {};
    var frag = document.createDocumentFragment();
    renderChildren(tpl.content, vals, frag);
    mount.textContent = '';
    mount.appendChild(frag);
    fit();

    if (focusId) {
      var again = document.getElementById(focusId);
      if (again) {
        again.focus();
        if (range && range[0] != null) {
          try { again.setSelectionRange(range[0], range[1]); } catch (e) { /* champ sans sélection */ }
        }
      }
    }
  }

  function schedule() {
    if (pending) return;
    pending = true;
    (window.queueMicrotask || setTimeout)(render);
  }

  class DCLogic {
    constructor(props) {
      this.props = props || {};
      this.state = {};
    }
    setState(patch) {
      var next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
      this.state = Object.assign({}, this.state, next);
      schedule();
    }
    forceUpdate() {
      schedule();
    }
  }

  function start() {
    mount = document.getElementById('dc-root');
    tpl = document.getElementById('dc-template');
    var logic = document.getElementById('dc-logic');
    if (!mount || !tpl || !logic) return;

    var Component = new Function('DCLogic', logic.textContent + '\n;return Component;')(DCLogic);
    comp = new Component({});
    if (!comp.state) comp.state = {};

    var first = tpl.content.firstElementChild;
    var width = first && first.style ? first.style.width : '';
    if (/^\d+px$/.test(width)) {
      fixedWidth = parseInt(width, 10);
      document.body.classList.add('screen-fixed');
      document.body.classList.add(fixedWidth <= 430 ? 'screen-phone' : fixedWidth >= 1200 ? 'screen-tv' : 'screen-email');
    }

    render();
    window.addEventListener('resize', fit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
