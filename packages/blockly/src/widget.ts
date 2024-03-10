import {
  DocumentRegistry,
  DocumentWidget,
  DocumentModel
} from '@jupyterlab/docregistry';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { 
  runIcon,
  stopIcon,
  saveIcon,
  //circleEmptyIcon,
  clearIcon,
  copyIcon,
  duplicateIcon
} from '@jupyterlab/ui-components';

import { JupyterFrontEnd } from '@jupyterlab/application';

import { SessionContextDialogs } from '@jupyterlab/apputils';
import { WidgetTracker } from '@jupyterlab/apputils';

import { CodeCell } from '@jupyterlab/cells';
import { TranslationBundle, nullTranslator } from '@jupyterlab/translation';
import { SplitPanel } from '@lumino/widgets';
import { Signal } from '@lumino/signaling';

import type Blockly from 'blockly';

import { closeDialog } from './dialog';
import { BlocklyLayout } from './layout';
import { BlocklyManager } from './manager';
import {
  BlocklyButton,
  SelectGenerator,
  SelectToolbox,
  Spacer
} from './toolbar';

import { JlbTools } from './tools';

const DIRTY_CLASS = 'jp-mod-dirty';


/**
 * DocumentWidget: widget that represents the view or editor for a file type.
 */
export class BlocklyEditor extends DocumentWidget<BlocklyPanel, DocumentModel> {

  private _context: DocumentRegistry.IContext<DocumentModel>;
  private _trans: TranslationBundle;
  private _manager: BlocklyManager;
  private _blayout: BlocklyLayout;
  private _dirty = false;

  constructor(app: JupyterFrontEnd, options: BlocklyEditor.IOptions) {
    super(options);

    this._context = options.context;
    this._manager = options.manager;

    // Loading the ITranslator
    this._trans = ((this._context as any).translator || nullTranslator).load('jupyterlab');

    // this.content is BlocklyPanel
    this._blayout = this.content.layout as BlocklyLayout;
    // Create and add a button to the toolbar to execute
    // the code.
    const button_save = new BlocklyButton({
      label: '',
      icon: saveIcon,
      className: 'jp-blockly-saveFile',
      onClick: () => this.save(true),
      tooltip: 'Save File'
    });

    const button_run = new BlocklyButton({
      label: '',
      icon: runIcon,
      className: 'jp-blockly-runButton',
      onClick: () => this._blayout.run(),
      tooltip: 'Run Code'
    });

    const button_stop = new BlocklyButton({
      label: '',
      icon: stopIcon,
      className: 'jp-blockly-stopButton',
      onClick: () => this._blayout.interrupt(),
      tooltip: 'Stop Code'
    });

    const button_clear = new BlocklyButton({
      label: '',
      //icon: circleEmptyIcon,
      icon: clearIcon,
      className: 'jp-blockly-clearButton',
      onClick: () => this._blayout.clearOutputArea(),
      tooltip: 'Copy Output View'
    });

    const button_copyOutput = new BlocklyButton({
      label: '',
      icon: copyIcon,
      className: 'jp-blockly-copyOutputButton',
      onClick: () => {
        const outputAreaAreas = this._blayout.cell.outputArea.node.getElementsByClassName('jp-OutputArea-output');
        if (outputAreaAreas.length > 0) {
          let element = outputAreaAreas[0];
          for (let i=1; i<outputAreaAreas.length; i++) {
            element.appendChild(outputAreaAreas[i]);
          }
          JlbTools.copyElement(element as HTMLElement);
        }
      },
      tooltip: 'Copy Output View'
    });

    const button_copyCode = new BlocklyButton({
      label: '',
      icon: duplicateIcon,
      className: 'jp-blockly-copyCodeButton',
      onClick: () => {
        JlbTools.copyElement(this._blayout.code.node);
      },
      tooltip: 'Copy Code View'
    });

    this.toolbar.addItem('save', button_save);
    this.toolbar.addItem('run', button_run);
    this.toolbar.addItem('stop', button_stop);
    this.toolbar.addItem('spacer1', new Spacer());
    this.toolbar.addItem('spacer2', new Spacer());
    this.toolbar.addItem('spacer3', new Spacer());
    this.toolbar.addItem('spacer5', new Spacer());
    this.toolbar.addItem('clear', button_clear);
    this.toolbar.addItem('copyOutput', button_copyOutput);
    this.toolbar.addItem('copyCode', button_copyCode);
    this.toolbar.addItem('spacer7', new Spacer());
    this.toolbar.addItem('spacer8', new Spacer());
    this.toolbar.addItem(
      'toolbox',
      new SelectToolbox({
        label: 'Toolbox',
        tooltip: 'Select tollbox',
        manager: options.manager
      })
    );
    this.toolbar.addItem(
      'generator',
      new SelectGenerator({
        label: 'Kernel',
        tooltip: 'Select kernel',
        manager: options.manager
      })
    );
    //
    this._manager.changed.connect(this._onBlockChanged, this);
  } /* End of constructor */


  // for dialog.ts
  get trans(): TranslationBundle {
    return this._trans;
  }

  //
  get blayout(): BlocklyLayout {
    return this._blayout;
  }

  //
  get cell(): CodeCell {
    return this._blayout?.cell;
  }

 /**
  * Sets the dirty boolean while also toggling the DIRTY_CLASS
  */
  private dirty(dirty: boolean): void {
    this._dirty = dirty;
    //
    if (this._dirty && !this.title.className.includes(DIRTY_CLASS)) {
      this.title.className += ' ' + DIRTY_CLASS;
    } else if (!this._dirty) {
      this.title.className = this.title.className.replace(DIRTY_CLASS, '');
    }
    this.title.className = this.title.className.replace('  ', ' ');
  }

  // 
  async save(exiting = false): Promise<void> {
    exiting ? await this._context.save() : this._context.save();
    this.dirty(false);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  async dispose(): Promise<void> {
    if (!this.isDisposed && this._dirty) {
      const isclose = await closeDialog(this);
      if (!isclose) return;
    }
    this.content.dispose();
    super.dispose();
  }

 //
  private _onBlockChanged(
    sender: BlocklyManager,
    change: BlocklyManager.Change
  ) {

    if (change === 'dirty') {
      this.dirty(true);
    }
    else if (change === 'focus') {
      this._blayout.setupWidgetView();
    }
  }
}

export namespace BlocklyEditor {
  export interface IOptions
    extends DocumentWidget.IOptions<BlocklyPanel, DocumentModel> {
    manager: BlocklyManager;
  }
}


/**
 * Widget that contains the main view of the DocumentWidget.
 */
export class BlocklyPanel extends SplitPanel {
  private _tracker: WidgetTracker<BlocklyEditor>;
  private _content;
  private _context: DocumentRegistry.IContext<DocumentModel>;
  private _rendermime: IRenderMimeRegistry;
  private _manager: BlocklyManager;
  private _editor: BlocklyEditor;

  /**
   * Construct a `BlocklyPanel`.
   *
   * @param context - The documents context.
   */
  constructor(
    tracker: WidgetTracker<BlocklyEditor>,
    context: DocumentRegistry.IContext<DocumentModel>,
    manager: BlocklyManager,
    rendermime: IRenderMimeRegistry
  ) {
    super({
      layout: new BlocklyLayout(manager, context.sessionContext, rendermime)
    });
    this.addClass('jp-BlocklyPanel');
    this._context = context;
    this._rendermime = rendermime;
    this._manager = manager;
    this._tracker = tracker;
    this._editor = null;

    // Load the content of the file when the context is ready
    this._context.ready.then(() => this._load());
    // Connect to the save signal
    this._context.saveState.connect(this._onSave, this);
  }

  /*
   * The code cell.
   */
  get cell(): CodeCell {
    return (this.layout as BlocklyLayout).cell;
  }

  /*
   * The rendermime instance used in the code cell.
   */
  get rendermime(): IRenderMimeRegistry {
    return this._rendermime;
  }

  get context() { 
    return this._context;
  }

  get content() {
    return this._content;
  }

  get manager(): BlocklyManager {
    return this._manager;
  }

  get activeLayout(): BlocklyLayout {
    return this.layout as BlocklyLayout;
  }

  set activeEditor(editor: BlocklyEditor) {
    this._editor = editor;
  }

  get activeEditor(): BlocklyEditor {
    return this._editor;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    Signal.clearData(this);
    super.dispose();
  }

  private _load(): void {
    // Loading the content of the document into the workspace
    let kernelname = '';
    this._content = this._context.model.toJSON() as any as Blockly.Workspace;
    if (this._content != null) {
      if (('metadata' in this._content) &&
          ('kernelspec' in this._content['metadata']) &&
          ('name' in this._content['metadata']['kernelspec'])) {
        kernelname = this._content['metadata']['kernelspec']['name'];
      }
    }

    if (kernelname === '') {
      if (this._editor.id === this._tracker.currentWidget.id) {
        const sessionContextDialogs = new SessionContextDialogs({translator: (this._context as any).translator});
        sessionContextDialogs.selectKernel(this._context.sessionContext);
      }
    }
    else {
      this._manager.selectKernel(kernelname);
    }

    (this.layout as BlocklyLayout).workspace = this._content;
    // Set Block View, Output View and Code View to DockPanel
    (this.layout as BlocklyLayout).setupWidgetView();
  }

  private _onSave(
    sender: DocumentRegistry.IContext<DocumentModel>,
    state: DocumentRegistry.SaveState
  ): void {
    if (state === 'started') {
      const workspace = (this.layout as BlocklyLayout).workspace;
      //
      if (this._manager['kernelspec'] != undefined) {
        workspace['metadata'] = {
            'kernelspec': {
            'display_name': this._manager.kernelspec.display_name,
            'language': this._manager.kernelspec.language,
            'name': this._manager.kernelspec.name
            }
        };
      }
      this._context.model.fromJSON(workspace as any);
    }
  }
}
