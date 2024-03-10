import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';
import { jsonIcon } from '@jupyterlab/ui-components';
import { WidgetTracker, ICommandPalette } from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ILauncher } from '@jupyterlab/launcher';
import { ITranslator } from '@jupyterlab/translation';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
//import { MainMenu } from '@jupyterlab/mainmenu';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { SessionContextDialogs } from '@jupyterlab/apputils';
import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';

import { BlocklyEditorFactory } from 'jupyterlab-broccoli';
import { BlocklyEditor } from 'jupyterlab-broccoli';
import { IBlocklyRegistry } from 'jupyterlab-broccoli';
import { JlbTools } from 'jupyterlab-broccoli';

import { blockly_icon } from './icons';


/**
 * The name of the factory that creates the editor widgets.
 */
const FACTORY = 'Blockly editor';

const PALETTE_CATEGORY = 'Blockly editor';

namespace CommandIDs {
  export const createNew = 'blockly:create-new-blockly-file';
  //
  export const interruptKernel = 'blockly:interrupt-to-kernel';
  export const restartKernel = 'blockly:restart-Kernel';
  export const restartKernelAndClear = 'blockly:restart-and-clear';
  //export const clearAllOutputs = 'blockly:clear-all-cell-outputs';
  //export const restartClear = 'blockly:restart-clear-output';
  //export const restartRunAll = 'blockly:restart-run-all';
  export const reconnectToKernel = 'blockly:reconnect-kernel';
  //
  export const copyBlocklyToClipboard = 'blockly:copy-to-clipboard';
  //export const copyNotebookToClipboard = 'notebook:copy-to-clipboard';
}

/**
 * The id of the translation plugin.
 */
const PLUGIN_ID = '@jupyterlab/translation-extension:plugin';

/**
 * Initialization data for the jupyterlab-broccoli extension.
 */
const plugin: JupyterFrontEndPlugin<IBlocklyRegistry> = {
  id: 'jupyterlab-broccoli:plugin',
  autoStart: true,
  requires: [
    ILayoutRestorer,
    IRenderMimeRegistry,
    IEditorServices,
    IFileBrowserFactory,
    ISettingRegistry,
    ITranslator,
  ],
  optional: [ILauncher, ICommandPalette, IMainMenu, IJupyterWidgetRegistry],
  provides: IBlocklyRegistry,
  activate: (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer,
    rendermime: IRenderMimeRegistry,
    editorServices: IEditorServices,
    browserFactory: IFileBrowserFactory,
    settings: ISettingRegistry,
    translator: ITranslator,
    launcher: ILauncher | null,
    palette: ICommandPalette | null,
    mainMenu: IMainMenu | null,
    widgetRegistry: IJupyterWidgetRegistry | null
  ): IBlocklyRegistry => {
    console.log('JupyterLab extension jupyterlab-broccoli is activated!');

    // Namespace for the tracker
    const namespace = 'jupyterlab-broccoli';

    // Creating the tracker for the document
    const tracker = new WidgetTracker<BlocklyEditor>({ namespace });

    // Handle state restoration.
    if (restorer) {
      // When restoring the app, if the document was open, reopen it
      restorer.restore(tracker, {
        command: 'docmanager:open',
        args: widget => ({ path: widget.context.path, factory: FACTORY }),
        name: widget => widget.context.path
      });
    }

    const trans = translator.load('jupyterlab');
    const { commands, shell } = app;

    const isEnabled = (): boolean => {
      return JlbTools.isEnabled(shell, tracker);
    };

    // Creating the widget factory to register it so the document manager knows about
    // our new DocumentWidget
    const widgetFactory = new BlocklyEditorFactory(app, tracker, {
      name: FACTORY,
      modelName: 'text',
      fileTypes: ['blockly'],
      defaultFor: ['blockly'],

      // Kernel options, in this case we need to execute the code generated
      // in the blockly editor. The best way would be to use kernels, for
      // that reason, we tell the widget factory to start a kernel session
      // when opening the editor, and close the session when closing the editor.
      canStartKernel: true,
      preferKernel: false,
      shutdownOnClose: true,

      // The rendermime instance, necessary to render the outputs
      // after a code execution. And the mimeType service to get the
      // mimeType from the kernel language
      rendermime: rendermime,
      mimetypeService: editorServices.mimeTypeService,

      // The translator instance, used for the internalization of the plugin.
      translator: translator
    });

    // Add the widget to the tracker when it's created
    widgetFactory.widgetCreated.connect((sender, widget) => {
      // Adding the Blockly icon for the widget so it appears next to the file name.
      widget.title.icon = blockly_icon;

      // Notify the instance tracker if restore data needs to update.
      widget.context.pathChanged.connect(() => {
        tracker.save(widget);
      });
      tracker.add(widget);
    });
    // Registering the file type
    app.docRegistry.addFileType({
      name: 'blockly',
      displayName: 'Blockly',
      contentType: 'file',
      fileFormat: 'json',
      extensions: ['.jpblockly'],
      mimeTypes: ['application/json'],
      icon: jsonIcon,
      iconLabel: 'JupyterLab-Blockly'
    });
    // Registering the widget factory
    app.docRegistry.addWidgetFactory(widgetFactory);

    function getSetting(setting: ISettingRegistry.ISettings): string {
      // Read the settings and convert to the correct type
      const currentLocale: string = setting.get('locale').composite as string;
      return currentLocale;
    }

    // Wait for the application to be restored and
    // for the settings for this plugin to be loaded
    settings.load(PLUGIN_ID).then(setting => {
      // Read the settings
      const currentLocale = getSetting(setting);

      // Listen for our plugin setting changes using Signal
      setting.changed.connect(getSetting);

      // Get new language and call the function that modifies the language name accordingly.
      // Also, make the transformation to have the name of the language package as in Blockly.
      const language =
        currentLocale[currentLocale.length - 2].toUpperCase() +
        currentLocale[currentLocale.length - 1].toLowerCase();
      console.log(`Current Language : '${language}'`);

      // Transmitting the current language to the manager.
      widgetFactory.registry.setlanguage(language);
    });

    //
    commands.addCommand(CommandIDs.createNew, {
      label: args => args['isPalette'] ? 'New Blockly Editor' : 'Blockly Editor',
      caption: 'Create a new Blockly Editor',
      icon: args => (args['isPalette'] ? null : blockly_icon),
      execute: async args => {
        // Get the directory in which the Blockly file must be created;
        // otherwise take the current filebrowser directory
        const cwd = args['cwd'] || browserFactory.tracker.currentWidget.model.path;

        // Create a new untitled Blockly file
        const model = await commands.execute('docmanager:new-untitled', {
          path: cwd,
          type: 'file',
          ext: '.jpblockly'
        });

        // Open the newly created file with the 'Editor'
        return commands.execute('docmanager:open', {
          path: model.path,
          factory: FACTORY
        });
      }
    });

    // Add the command to the launcher
    if (launcher) {
      launcher.add({
        command: CommandIDs.createNew,
        category: trans.__('Other'),
        rank: 1
      });
    }

    // Add the command to the palette
    if (palette) {
      palette.addItem({
        command: CommandIDs.createNew,
        args: { isPalette: true },
        category: PALETTE_CATEGORY
      });
    }

    //
    // Context Menu
    commands.addCommand(CommandIDs.copyBlocklyToClipboard, {
      label: trans.__('Copy Blockly Output View to Clipboard'),
      execute: args => {
        const current = JlbTools.getCurrentWidget(shell, tracker, args);
        if (current) {
          const outputAreaAreas = current.cell.outputArea.node.getElementsByClassName('jp-OutputArea-output');
          if (outputAreaAreas &&  outputAreaAreas.length > 0) {
            let element = outputAreaAreas[0];
            for (let i=1; i<outputAreaAreas.length; i++) {
              element.appendChild(outputAreaAreas[i]);
            }
            JlbTools.copyElement(element as HTMLElement);
          }
        }
      },
      isEnabled
    });

    // app.contextMenu : ContextMenuSvg
    // app.contextMenu.menu : MenuSvg
    app.contextMenu.addItem({
      command: CommandIDs.copyBlocklyToClipboard,
      selector: '.jp-OutputArea-child',
      rank: 0,
    });


    //
    // Main Menu
    commands.addCommand(CommandIDs.interruptKernel, {
      label: trans.__('Interrupt Kernel'),
      caption: trans.__('Interrupt the kernel'),
      execute: args => { 
        const current = JlbTools.getCurrentWidget(shell, tracker, args);
        if (!current) return;
        const kernel = current.context.sessionContext.session?.kernel;
        if (kernel) return kernel.interrupt();
      },
      isEnabled
      //isEnabled: args => (args.toolbar ? true : isEnabled()),
      //icon: args => (args.toolbar ? stopIcon : undefined)
    });

    commands.addCommand(CommandIDs.restartKernel, {
      label: trans.__('Restart Kernel…'),
      caption: trans.__('Restart the kernel'),
      execute: args => { 
        const current = JlbTools.getCurrentWidget(shell, tracker, args);
        if (current) {
          const sessionDialogs = new  SessionContextDialogs({translator});
          return sessionDialogs.restart(current.context.sessionContext);
        }
      },
      isEnabled
    });

    commands.addCommand(CommandIDs.restartKernelAndClear, {
      label: trans.__('Clear…'),
      caption: trans.__('Restart the kernel and clear output view'),
      execute: args => { 
        const current = JlbTools.getCurrentWidget(shell, tracker, args);
        if (current) {
          current.blayout?.clearOutputArea();
        }
      },
      isEnabled
    });

    commands.addCommand(CommandIDs.reconnectToKernel, {
      label: trans.__('Reconnect to Kernel'),
      caption: trans.__('Reconnect to the kernel'),
      execute: args => { 
        const current = JlbTools.getCurrentWidget(shell, tracker, args);
        if (!current) return;
        const kernel = current.context.sessionContext.session?.kernel;
        if (kernel) return kernel.reconnect();
      },
      isEnabled: args => (args.toolbar ? true : isEnabled())
    });

    // Add the command to the main menu
    if (mainMenu) {
      mainMenu.kernelMenu.kernelUsers.interruptKernel.add({
        id: CommandIDs.interruptKernel,
        isEnabled
      });

      mainMenu.kernelMenu.kernelUsers.restartKernel.add({
        id: CommandIDs.restartKernel,
        isEnabled
      });

      mainMenu.kernelMenu.kernelUsers.clearWidget.add({
        id: CommandIDs.restartKernelAndClear,
        isEnabled
      });

      mainMenu.kernelMenu.kernelUsers.reconnectToKernel.add({
        id: CommandIDs.reconnectToKernel,
        isEnabled
      });
    }

/*
    if (widgetRegistry) {
      tracker.forEach(panel => {
        registerWidgetManager(
          panel.context as any,
          panel.content.rendermime,
          widgetRenderers([panel.content.cell])
        );
      });

      tracker.widgetAdded.connect((sender, panel) => {
        const kernel = panel.context.sessionContext.session?.kernel;
        if (kernel) {
          registerWidgetManager(
            panel.context as any,
            panel.content.rendermime,
            widgetRenderers([panel.content.cell])
          );
        }
      });
    }
*/
    return widgetFactory.registry;
  }
};


/*
function* widgetRenderers(cells: CodeCell[]): IterableIterator<WidgetRenderer> {
  for (const w of cells) {
    if (w instanceof WidgetRenderer) {
      yield w;
    }
  }
}
*/


//
const plugins: JupyterFrontEndPlugin<any>[] = [
  plugin,
];
export default plugins;

