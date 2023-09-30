import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISessionContext, showErrorMessage } from '@jupyterlab/apputils';
import { CodeCell, CodeCellModel } from '@jupyterlab/cells';

import { Message } from '@lumino/messaging';
import { SplitLayout, SplitPanel, Widget } from '@lumino/widgets';
import { DockPanel } from '@lumino/widgets';
import { IIterator, ArrayIterator } from '@lumino/algorithm';
import { Signal } from '@lumino/signaling';

import * as Blockly from 'blockly';

import { BlocklyManager } from './manager';
import { THEME } from './utils';

import {
  codeIcon,
  circleIcon,
} from '@jupyterlab/ui-components';

/**
 * A blockly layout to host the Blockly editor.
 */
export class BlocklyLayout extends SplitLayout {
  private _host: Widget;
  private _manager: BlocklyManager;
  private _workspace: Blockly.WorkspaceSvg;
  private _sessionContext: ISessionContext;
  private _cell: CodeCell;
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

    // Creating the container for the Blockly editor
    // and the output area to render the execution replies.
    this._host = new Widget();
    this._dock = new DockPanel();

    // Creating a CodeCell widget to render the code and
    // outputs from the execution reply.
    this._cell = new CodeCell({
      model: new CodeCellModel({}),
      rendermime
    });
    // Trust the outputs and set the mimeType for the code
    this._cell.addClass('jp-blockly-codeCell');
    this._cell.readOnly = true;
    this._cell.model.trusted = true;
    this._cell.model.mimeType = this._manager.mimeType;
    // adding the style to the element as a quick fix
    // we should make it work with the css class
    this._cell.node.style.overflow = 'scroll';
    this._cell.title.icon = codeIcon;
    this._cell.title.label = 'Code View';
    //
    this._cell.outputArea.node.style.overflow = 'scroll';
    this._cell.outputArea.node.style.cssText = 'border: 0px;';
    this._cell.outputArea.title.icon = circleIcon;
    this._cell.outputArea.title.label = 'Output View';
    //
    this._manager.changed.connect(this._onManagerChanged, this);
  }

  get activeCell(): CodeCell {
    return this._cell;
  }

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
  iter(): IIterator<Widget> {
    return new ArrayIterator([]);
  }

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
      this._dock.activateWidget(this._cell.outputArea);
      //
      CodeCell.execute(this._cell, this._sessionContext)
        .then(() => this._resizeWorkspace())
        .catch(e => console.error(e));
      //
      let style = this._cell.outputArea.node.style.cssText;
      this._cell.outputArea.node.style.cssText = style.replace('top: 26px;', 'top: 40px; border: 0px;');
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
      this._dock.addWidget(this._cell);
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
      const code =
        extra_init + this._manager.generator.workspaceToCode(this._workspace);
      this._cell.model.sharedModel.setSource(code);
      //
      if (event.type == Blockly.Events.FINISHED_LOADING) {
        this._finishedLoading = true;
      }
      else if (this._finishedLoading && (
          event.type == Blockly.Events.BLOCK_CHANGE ||
          event.type == Blockly.Events.BLOCK_CREATE ||
          event.type == Blockly.Events.BLOCK_DELETE ||
          event.type == Blockly.Events.BLOCK_MOVE)) {
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
      const code =
        extra_init + this._manager.generator.workspaceToCode(this._workspace);
      this._cell.model.sharedModel.setSource(code);
      this._cell.model.mimeType = this._manager.mimeType;
    }
    else if (change === 'toolbox') {
      this._workspace.updateToolbox(this._manager.toolbox as any);
    }
  }
}
