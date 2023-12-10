import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentModel
} from '@jupyterlab/docregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';
import { CodeCell } from '@jupyterlab/cells';
import { TranslationBundle, nullTranslator } from '@jupyterlab/translation';

import { BlocklyEditor, BlocklyPanel } from './widget';
import { BlocklyRegistry } from './registry';
import { BlocklyManager } from './manager';


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
  private _app: JupyterFrontEnd;
  private _tracker: WidgetTracker<BlocklyEditor>;
  private _cell: CodeCell;
  private _trans: TranslationBundle;

  /**
   * Constructor of BlocklyEditorFactory.
   *
   * @param options Constructor options
   */
  constructor(app: JupyterFrontEnd, tracker: WidgetTracker<BlocklyEditor>, options: BlocklyEditorFactory.IOptions) {
    super(options);
    this._app = app;
    this._tracker = tracker;
    this._registry = new BlocklyRegistry();
    this._rendermime = options.rendermime;
    this._mimetypeService = options.mimetypeService;
    this._trans = (options.translator || nullTranslator).load('jupyterlab');
    this._cell = null;
  }

  //
  get trans(): TranslationBundle {
    return this._trans;
  }

  get registry(): BlocklyRegistry {
    return this._registry;
  }

  get manager(): BlocklyManager {
    return this._manager;
  }

  get cell(): CodeCell {
    return this._cell;
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
    const content = new BlocklyPanel(this._tracker, context, manager, this._rendermime);
    this._cell = content.activeLayout.cell;

    const editor = new BlocklyEditor(this._app, { context, content, manager });
    content.activeEditor = editor;
    return editor;
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

