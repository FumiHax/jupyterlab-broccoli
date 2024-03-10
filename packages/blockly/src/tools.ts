/**
*/

import { JupyterFrontEnd } from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';

import { BlocklyEditor } from './widget';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';


export namespace JlbTools {
     //
    export function copyElement(e: HTMLElement): void {
        const sel = window.getSelection();
        if (sel == null) return;
        // Save the current selection.
        const savedRanges: Range[] = [];
        for (let i = 0; i < sel.rangeCount; ++i) {
            savedRanges[i] = sel.getRangeAt(i).cloneRange();
        }
        //
        const range = document.createRange();
        range.selectNodeContents(e);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        // Restore the saved selection.
        sel.removeAllRanges();
        savedRanges.forEach(r => sel.addRange(r));
    }


    // for Tracker
    export function isEnabled(
        shell: JupyterFrontEnd.IShell,
        tracker: WidgetTracker<BlocklyEditor>
    ): boolean {
        return (
            tracker.currentWidget !== null &&
            tracker.currentWidget === shell.currentWidget
        );
    }


    // for Tracker
    export function getCurrentWidget(
        shell: JupyterFrontEnd.IShell,
        tracker: WidgetTracker<BlocklyEditor>,
        args: ReadonlyPartialJSONObject
    ): BlocklyEditor | null {
        const widget = tracker.currentWidget;
        if (args!==null) {
          const activate = args['activate'] !== false;
          if (activate && widget) shell.activateById(widget.id);
        }
        return tracker.currentWidget;
    }


    // for Debug
    export function disp_obj(obj: object) {
        const getMethods = (obj: object): string[] => {
            const getOwnMethods = (obj: object) =>
                Object.entries(Object.getOwnPropertyDescriptors(obj))
                    .filter(([name, {value}]) => typeof value === 'function' && name !== 'constructor')
                    .map(([name]) => name)
            const _getMethods = (o: object, methods: string[]): string[] =>
                o === Object.prototype ? methods : _getMethods(Object.getPrototypeOf(o), methods.concat(getOwnMethods(o)))
            return _getMethods(obj, [])
        }

        console.log("+++++++++++++++++++++++++++++++++++");
        for (const key in obj) {
            console.log(String(key) + " -> " + obj[key]);
        }
        console.log("===================================");
        console.log(getMethods(obj));
        console.log("-----------------------------------");
    }
}

