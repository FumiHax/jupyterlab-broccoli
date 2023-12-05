import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISessionContext, showErrorMessage } from '@jupyterlab/apputils';
//import { CodeCell, CodeCellModel } from '@jupyterlab/cells';
import { CodeCell, CodeCellModel } from '@jupyterlab/cells';
//import { CodeCell, RawCellModel } from '@jupyterlab/cells';

import { Message } from '@lumino/messaging';
import { SplitLayout, SplitPanel, Widget } from '@lumino/widgets';
//import { BoxLayout, Widget } from '@lumino/widgets';
import { DockPanel } from '@lumino/widgets';
//import { IIterator, ArrayIterator } from '@lumino/algorithm';
import { Signal } from '@lumino/signaling';

import * as Blockly from 'blockly';

import { BlocklyManager } from './manager';
import { THEME } from './utils';

import {
  codeIcon,
  circleIcon,
} from '@jupyterlab/ui-components';

import { Cell } from '@jupyterlab/cells';
//import { InputArea } from '@jupyterlab/cells';
//import { SimplifiedOutputArea, OutputAreaModel } from '@jupyterlab/outputarea';
//import { CodeMirrorEditor } from './editor';
//import { CodeEditor } from '@jupyterlab/codeeditor'
import {
//  CodeMirrorEditor,
  CodeMirrorEditorFactory,
//  CodeMirrorMimeTypeService,
//  EditorLanguageRegistry
} from '@jupyterlab/codemirror'

import {
//  ISharedRawCell,
} from '@jupyter/ydoc';


/**
 * A blockly layout to host the Blockly editor.
 */
export class BlocklyLayout extends SplitLayout {
//export class BlocklyLayout extends BoxLayout {
  private _host: Widget;
  private _code: Widget;
  private _manager: BlocklyManager;
  private _workspace: Blockly.WorkspaceSvg;
  private _sessionContext: ISessionContext;
  private _cell: CodeCell;
//  private _inpt: InputArea;
//  private _output: SimplifiedOutputArea;
//  private _output_style: string;
//  private _code_style: string;
  private _finishedLoading = false;
  private _dock;

  /**
   * Construct a `BlocklyLayout`.
   *
   */
  constructor(
    manager: BlocklyManager,
    sessionContext: ISessionContext,
    rendermime: IRenderMimeRegistry
  ) {
    super({ renderer: SplitPanel.defaultRenderer, orientation: 'horizontal' });
    this._manager = manager;
    this._sessionContext = sessionContext;
/*
    --jp-code-font-size: 13px;
    --jp-code-line-height: 1.3077;
    --jp-code-padding: 5px;
    --jp-code-font-family-default: menlo, consolas, 'DejaVu Sans Mono', monospace;
    --jp-code-font-family: var(--jp-code-font-family-default);
    --jp-code-presentation-font-size: 16px;
    --jp-code-cursor-width0: 1.4px;
    --jp-code-cursor-width1: 2px;
    --jp-code-cursor-width2: 4px;
*/

    // Creating the container for the Blockly editor
    // and the output area to render the execution replies.
    this._host = new Widget();
    this._dock = new DockPanel();

/*
    const inlineCodeMirrorConfig = {
      ...this.defaultConfig,
      extraKeys: {
        'Cmd-Right': 'goLineRight',
        End: 'goLineRight',
        'Cmd-Left': 'goLineLeft',
        Tab: 'indentMoreOrinsertTab',
        'Shift-Tab': 'indentLess',
        'Cmd-/': cm => cm.toggleComment({ indent: true }),
        'Ctrl-/': cm => cm.toggleComment({ indent: true }),
        'Ctrl-G': 'find',
        'Cmd-G': 'find'
      },
      defaults: Partial<CodeMirrorEditor.IConfig> = {},
     // defaults
    };
*/

/*
    const documentCodeMirrorConfig = {
//      ...CodeMirrorEditor.defaultConfig,
      extraKeys: {
        Tab: 'indentMoreOrinsertTab',
        'Shift-Tab': 'indentLess',
        'Cmd-/': cm => cm.toggleComment({ indent: true }),
        'Ctrl-/': cm => cm.toggleComment({ indent: true }),
        'Shift-Enter': () => {
        }
      },
      lineNumbers: true,
      scrollPastEnd: true,
//      ...defaults
    };
*/



    const factoryService = new CodeMirrorEditorFactory({});
    // Creating a CodeCell widget to render the code and
    // outputs from the execution reply.
    this._cell = new CodeCell({
      //model: new CodeCellModel({}),
      model: new CodeCellModel(),
      contentFactory: new Cell.ContentFactory({
        editorFactory: factoryService.newInlineEditor
        //editorFactory: factoryService.newInlineEditor.bind(factoryService)
      }),
      rendermime
    });

    // Trust the outputs and set the mimeType for the code
    this._cell.addClass('jp-blockly-codeCell');
    this._cell.title.label = '_Code View';
    this._cell.title.icon = codeIcon;
    this._cell.readOnly = true;
    this._cell.model.trusted = true;
    this._cell.model.mimeType = this._manager.mimeType;
    this._cell.node.style.overflow = 'scroll';
    //
    this._cell.outputArea.title.label = '_Output View';
    this._cell.outputArea.title.icon = circleIcon;
    this._cell.outputArea.node.style.overflow = 'scroll';
    this._cell.outputArea.node.style.marginTop = '40px';
    this._cell.outputArea.node.style.paddingBottom = '100px';
    this._cell.outputArea.node.style.border = '0px';

//http://alphasis.info/javascript/dom/styleobject/
//https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
    this._code = new Widget();
    this._code.addClass('jp-blockly-displayCell');
    this._code.title.icon = codeIcon;
    this._code.title.label = '_Code View';
    this._code.node.style.height = '100%';
    //this._code.node.style.overflow = 'scroll';
    this._code.node.style.overflowY = 'scroll';
    this._code.node.style.fontSize = 'var(--jp-code-font-size)';
    this._code.node.style.fontFamily = 'var(--jp-code-font-family)';
    this._code.node.style.fontWeight = 'bold';
    this._code.node.style.marginTop = '40px';
    this._code.node.style.paddingLeft = '60px';
    this._code.node.style.paddingBottom = '100px';
    this._code.node.style.border = '0px';
    this._code.node.style.whiteSpace = 'pre';
/*
    // InputArea of code
    this._inpt = new InputArea({
      model: new CodeCellModel({}),
      contentFactory: new Cell.ContentFactory({
        //editorFactory: factoryService.newDocumentEditor
        editorFactory: factoryService.newDocumentEditor.bind(factoryService)
        //editorFactory: factoryService.newInlineEditor
        //editorFactory: factoryService.newInlineEditor.bind(factoryService)
      })
    });
    this._inpt.model.trusted = true;
    this._inpt.model.mimeType = this._manager.mimeType;
    this._inpt.node.style.cssText = 'input: read-only; textarea:read-only; border: 0px;';
    this._inpt.title.icon = codeIcon;
    this._inpt.title.label = '_Code View';
*/

    //
/*
    this._output = new SimplifiedOutputArea({
      model: new OutputAreaModel({ trusted: true }),
      rendermime
    });
*/

    //
    this._manager.changed.connect(this._onManagerChanged, this);
  }

/*
  const defaultConfig: Required<IConfig> = {
    ...CodeEditor.defaultConfig,
    mode: 'null',
    theme: 'jupyter',
    smartIndent: true,
    electricChars: true,
    keyMap: 'default',
    extraKeys: null,
    gutters: [],
    fixedGutter: true,
    showCursorWhenSelecting: false,
    coverGutterNextToScrollbar: false,
    dragDrop: true,
    lineSeparator: null,
    scrollbarStyle: 'native',
    lineWiseCopyCut: true,
    scrollPastEnd: false,
    styleActiveLine: false,
    styleSelectedText: true,
    selectionPointer: false,
    rulers: [],
    foldGutter: false,
    handlePaste: true
  };
*/


  /*
   * The code cell.
   */
  get cell(): CodeCell {
    return this._cell;
  }

  /*
   * The current workspace.
   */
  get workspace(): Blockly.Workspace {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return Blockly.serialization.workspaces.save(this._workspace);
  }

  /*
   * Set a new workspace.
   */
  set workspace(workspace: Blockly.Workspace) {
    const data = workspace === null ? { variables: [] } : workspace;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Blockly.serialization.workspaces.load(data, this._workspace);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._manager.changed.disconnect(this._resizeWorkspace, this);
    Signal.clearData(this);
    this._workspace.dispose();
    super.dispose();
  }

  /**
   * Init the blockly layout
   */
  init(): void {
    super.init();
    this.insertWidget(0, this._host);
  }

  /**
   * Create an iterator over the widgets in the layout.
   */
/*
  iter(): IIterator<Widget> {
    return new ArrayIterator([]);
  }
*/

  /**
   * Remove a widget from the layout.
   *
   * @param widget - The `widget` to remove.
   */
  removeWidget(widget: Widget): void {
    return;
  }

  /**
   * Return the extra coded (if it exists), composed of the individual
   * data from each block in the workspace, which are defined in the
   * toplevel_init property. (e.g. : imports needed for the block)
   *
   * Add extra code example:
   * Blockly.Blocks['block_name'].toplevel_init = `import numpy`
   */
  getBlocksToplevelInit(): string {
    // Initalize string which will return the extra code provided
    // by the blocks, in the toplevel_init property.
    let finalToplevelInit = '';

    // Get all the blocks in the workspace in order.
    const ordered = true;
    const used_blocks = this._workspace.getAllBlocks(ordered);

    // For each block in the workspace, check if theres is a toplevel_init,
    // if there is, add it to the final string.
    for (const block in used_blocks) {
      const current_block = used_blocks[block].type;
      if (Blockly.Blocks[current_block].toplevel_init) {
        // console.log(Blockly.Blocks[current_block].toplevel_init);
        // Attach it to the final string
        const string = Blockly.Blocks[current_block].toplevel_init;
        finalToplevelInit = finalToplevelInit + string;
      }
    }
    // console.log(finalToplevelInit);
    return finalToplevelInit;
  }

  /*
   * Generates and runs the code from the current workspace.
   */
  run(): void {
    // Get extra code from the blocks in the workspace.
    const extra_init = this.getBlocksToplevelInit();
    // Serializing our workspace into the chosen language generator.
    const code =
      extra_init + this._manager.generator.workspaceToCode(this._workspace);
    //const code = "import ipywidgets as widgets\nwidgets.IntSlider()";
    this._cell.model.sharedModel.setSource(code);
    this._code.node.innerText = code;

    // Execute the code using the kernel, by using a static method from the
    // same class to make an execution request.
    if (this._sessionContext.hasNoKernel) {
      // Check whether there is a kernel
      showErrorMessage(
        'Select a valid kernel',
        `There is not a valid kernel selected, select one from the dropdown menu in the toolbar.
        If there isn't a valid kernel please install 'xeus-python' from Pypi.org or using mamba.
        `
      );
    } else {
      CodeCell.execute(this._cell, this._sessionContext)
        .then(() => this._resizeWorkspace())
        .catch(e => console.error(e));
      //
/*
      let style = this._cell.outputArea.node.style.cssText;
      if (!style.includes('top: ')) this._cell.outputArea.node.style.cssText  +=  this._output_style;
      else this._cell.outputArea.node.style.cssText = style.replace('top: 26px;', this._output_style);
*/

      // focus outputArea
      this._dock.activateWidget(this._cell.outputArea);
    }
  }

  interrupt(): void {
    if (!this._sessionContext.hasNoKernel) {
      const kernel = this._sessionContext.session.kernel;
      kernel.interrupt();
    }
  }

  clearOutputArea(): void {
    this._dock.activateWidget(this._cell.outputArea);
    this._cell.outputArea.model.clear();
  }

  setupWidgetView(): void {
    if (!this._host.isVisible) { 
      this.removeWidgetAt(0);
      this.insertWidget(0, this._host);
    }
    if (this._cell.outputArea!=null && !this._cell.outputArea.isVisible) { 
      this._dock.addWidget(this._cell.outputArea);
      this._dock.addWidget(this._code);
      //this._dock.addWidget(this._cell);
      this.removeWidgetAt(1);
      this.insertWidget(1, this._dock);
    }
  }

  /**
   * Handle `update-request` messages sent to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this._resizeWorkspace();
  }

  /**
   * Handle `resize-request` messages sent to the widget.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    this._resizeWorkspace();
  }

  /**
   * Handle `fit-request` messages sent to the widget.
   */
  protected onFitRequest(msg: Message): void {
    super.onFitRequest(msg);
    this._resizeWorkspace();
  }

  /**
   * Handle `after-attach` messages sent to the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    //inject Blockly with appropiate JupyterLab theme.
    this._workspace = Blockly.inject(this._host.node, {
      toolbox: this._manager.toolbox,
      theme: THEME
    });

    this._workspace.addChangeListener((event) => {
      // Get extra code from the blocks in the workspace.
      const extra_init = this.getBlocksToplevelInit();
      // Serializing our workspace into the chosen language generator.
      const code = extra_init + this._manager.generator.workspaceToCode(this._workspace);
      this._cell.model.sharedModel.setSource(code);
      this._code.node.innerText = code;
      //
      if (event.type == Blockly.Events.FINISHED_LOADING) {
        this._finishedLoading = true;
      }
      else if (this._finishedLoading && (
          event.type == Blockly.Events.BLOCK_CHANGE ||
          event.type == Blockly.Events.BLOCK_CREATE ||
          event.type == Blockly.Events.BLOCK_MOVE   ||
          event.type == Blockly.Events.BLOCK_DELETE))
      {
        // dirty workspace
        this._manager.dirty(true);
      }
    });
  }

  private _resizeWorkspace(): void {
    //Resize logic.
    Blockly.svgResize(this._workspace);
  }

  private _onManagerChanged(
    sender: BlocklyManager,
    change: BlocklyManager.Change
  ) {
    if (change === 'kernel') {
      // Get extra code from the blocks in the workspace.
      const extra_init = this.getBlocksToplevelInit();
      // Serializing our workspace into the chosen language generator.
      const code = extra_init + this._manager.generator.workspaceToCode(this._workspace);
      this._cell.model.sharedModel.setSource(code);
      this._cell.model.mimeType = this._manager.mimeType;
      this._code.node.innerText = code;
    }
    else if (change === 'toolbox') {
      this._workspace.updateToolbox(this._manager.toolbox as any);
    }
  }
}
