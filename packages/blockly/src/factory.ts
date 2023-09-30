import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentModel
} from '@jupyterlab/docregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';

import { BlocklyEditor, BlocklyPanel } from './widget';
import { BlocklyRegistry } from './registry';
import { BlocklyManager } from './manager';

import { JupyterFrontEnd } from '@jupyterlab/application';
//import { TranslationBundle, nullTranslator } from '@jupyterlab/translation';

/*
namespace CommandIDs {
  export const copyToClipboard = 'jupyterlab-broccoli:copy-to-clipboard';
}
/**/

/**
 * A widget factory to create new instances of BlocklyEditor.
 */
export class BlocklyEditorFactory extends ABCWidgetFactory<
  BlocklyEditor,
  DocumentModel
> {
  private _registry: BlocklyRegistry;
  private _rendermime: IRenderMimeRegistry;
  private _mimetypeService: IEditorMimeTypeService;
  private _manager: BlocklyManager;
  //private _trans: TranslationBundle;
  private _app: JupyterFrontEnd;

  /**
   * Constructor of BlocklyEditorFactory.
   *
   * @param options Constructor options
   */
  constructor(app: JupyterFrontEnd, options: BlocklyEditorFactory.IOptions) {
    super(options);
    this._app = app;
    this._registry = new BlocklyRegistry();
    this._rendermime = options.rendermime;
    this._mimetypeService = options.mimetypeService;
    //this._trans = (options.translator || nullTranslator).load('jupyterlab');

/*
    app.commands.addCommand(CommandIDs.copyToClipboard, {
      label: this._trans.__('ZZZZ Copy Output to Clipboard'),
      execute: args => { alert("OK") }
    });

    app.contextMenu.addItem({
      command: CommandIDs.copyToClipboard,
      selector: '.jp-OutputArea-child',
      rank: 0
    });
/**/

  }

  get registry(): BlocklyRegistry {
    return this._registry;
  }

  get manager(): BlocklyManager {
    return this._manager;
  }

  /**
   * Create a new widget given a context.
   *
   * @param context Contains the information of the file
   * @returns The widget
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<DocumentModel>
  ): BlocklyEditor {
    // Set a map to the model. The widgets manager expects a Notebook model
    // but the only notebook property it uses is the metadata.
    context.model['metadata'] = new Map();
    const manager = new BlocklyManager(
      this._app,
      this._registry,
      context.sessionContext,
      this._mimetypeService
    );
    this._manager = manager;
    const content = new BlocklyPanel(context, manager, this._rendermime);
    return new BlocklyEditor(this._app, { context, content, manager });
  }
}

export namespace BlocklyEditorFactory {
  export interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    /*
     * A rendermime instance.
     */
    rendermime: IRenderMimeRegistry;
    /*
     * A mimeType service instance.
     */
    mimetypeService: IEditorMimeTypeService;
  }
}
