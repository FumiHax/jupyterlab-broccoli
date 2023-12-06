
import { Widget } from '@lumino/widgets';
import { codeIcon } from '@jupyterlab/ui-components';

import HLjs from 'highlight.js';

import PythonLang from 'highlight.js/lib/languages/python';
import PHPLang from 'highlight.js/lib/languages/php';
import LuaLang from 'highlight.js/lib/languages/lua';
import DartLang from 'highlight.js/lib/languages/dart';
import JsLang from 'highlight.js/lib/languages/javascript';
import TsLang from 'highlight.js/lib/languages/typescript';
import CLang from 'highlight.js/lib/languages/c';
import CppLang from 'highlight.js/lib/languages/cpp';
import JuliaLang from 'highlight.js/lib/languages/julia';
import RLang from 'highlight.js/lib/languages/r';
import XmlLang from 'highlight.js/lib/languages/xml';

import 'highlight.js/styles/github.css';

//declare function require(string): any;


/**
  http://alphasis.info/javascript/dom/styleobject/
  https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
  https://www.npmjs.com/package/highlight.js?activeTab=readme#basic-usage
 */
export class SourceCodeWidget extends Widget {

  private _source: string;
  private _language: string;

  //
  constructor(classname: string, title: string) {
    super();
    //
    this.addClass(classname);
    this.title.label = title;
    this.title.icon = codeIcon;
    this.default_style();

    this._source = '';
    this._language = 'python'
    this.setLanguage(this._language);
  }

  //
  default_style(): void {
    this.node.style.height = '100%';
    this.node.style.overflowX = 'scroll';
    this.node.style.overflowY = 'scroll';
    this.node.style.paddingTop = '40px';
    this.node.style.paddingLeft = '60px';
    this.node.style.paddingBottom = '100px';
    this.node.style.border = '0px';
    this.node.style.whiteSpace = 'pre';
    this.node.style.fontSize = 'var(--jp-code-font-size)';
    this.node.style.fontFamily = 'var(--jp-code-font-family)';
    this.node.style.fontWeight = 'bold';
  }

  //
  setLanguage(lang: string) {
    if (lang=='python') HLjs.registerLanguage(lang, PythonLang);
    else if (lang=='php') HLjs.registerLanguage(lang, PHPLang);
    else if (lang=='lua') HLjs.registerLanguage(lang, LuaLang);
    else if (lang=='dart') HLjs.registerLanguage(lang, DartLang);
    else if (lang=='js') HLjs.registerLanguage(lang, JsLang);
    else if (lang=='ts') HLjs.registerLanguage(lang, TsLang);
    else if (lang=='c') HLjs.registerLanguage(lang, CLang);
    else if (lang=='cpp') HLjs.registerLanguage(lang, CppLang);
    else if (lang=='julia') HLjs.registerLanguage(lang, JuliaLang);
    else if (lang=='r') HLjs.registerLanguage(lang, RLang);
    else if (lang=='xml') HLjs.registerLanguage(lang, XmlLang);
    //
    this._language = lang;
  }

  //
  setSource(code: string) {
    this._source = code;

    const html = HLjs.highlight(code, {language: this._language}).value;
    this.node.innerHTML = html;
  }

  //
  getSource(): string {
    return this._source; 
  }
}

