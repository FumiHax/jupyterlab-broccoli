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
import { MainMenu, IMainMenu } from '@jupyterlab/mainmenu';
import { SessionContextDialogs } from '@jupyterlab/apputils';
import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';

/*
import { CodeCell } from '@jupyterlab/cells';
import {
  WidgetRenderer,
  registerWidgetManager
} from '@jupyter-widgets/jupyterlab-manager';
*/

import {
  ReadonlyPartialJSONObject,
} from '@lumino/coreutils';

import { BlocklyEditorFactory } from 'jupyterlab-broccoli';
import { BlocklyEditor } from 'jupyterlab-broccoli';
import { IBlocklyRegistry } from 'jupyterlab-broccoli';
import { blockly_icon } from './icons';

//import { JLBTools } from 'jupyterlab-broccoli';

/*
import {
  stopIcon,
  refreshIcon
} from '@jupyterlab/ui-components';
*/

/**
 * The name of the factory that creates the editor widgets.
 */
const FACTORY = 'Blockly editor';

const PALETTE_CATEGORY = 'Blockly editor';

namespace CommandIDs {
  export const createNew = 'blockly:create-new-blockly-file';
  export const interruptKernel = 'blockly:interrupt-to-kernel';
  export const reconnectToKernel = 'blockly:reconnect-kernel';
  export const restartKernel = 'blockly:restart-kernel';
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
      return TrackerTools.isEnabled(shell, tracker);
    };

    // Creating the widget factory to register it so the document manager knows about
    // our new DocumentWidget
    const widgetFactory = new BlocklyEditorFactory(app, {
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

    // Main Menu
    commands.addCommand(CommandIDs.interruptKernel, {
      label: trans.__('Interrupt Kernel'),
      caption: trans.__('Interrupt the kernel'),
      execute: args => { 
        const current = TrackerTools.getCurrentWidget(tracker, shell, args);
        if (!current) return;
        const kernel = current.context.sessionContext.session?.kernel;
        if (kernel) return kernel.interrupt();
      },
      isEnabled: args => (args.toolbar ? true : isEnabled()),
      //icon: args => (args.toolbar ? stopIcon : undefined)
    });

    commands.addCommand(CommandIDs.reconnectToKernel, {
      label: trans.__('Reconnect to Kernel'),
      caption: trans.__('Reconnect to the kernel'),
      execute: args => { 
        const current = TrackerTools.getCurrentWidget(tracker, shell, args);
        if (!current) return;
        const kernel = current.context.sessionContext.session?.kernel;
        if (kernel) return kernel.reconnect();
      },
      isEnabled
    });

    commands.addCommand(CommandIDs.restartKernel, {
      label: trans.__('Restart Kernel…'),
      caption: trans.__('Restart the kernel'),
      execute: args => { 
        const current = TrackerTools.getCurrentWidget(tracker, shell, args);
        if (current) {
          const sessionDialogs = new  SessionContextDialogs({translator});
          return sessionDialogs.restart(current.context.sessionContext);
        }
      },
      isEnabled: args => (args.toolbar ? true : isEnabled()),
      //icon: args => (args.toolbar ? refreshIcon : undefined)
    });

    // Add the command to the main menu
    if (mainMenu) {
      mainMenu.kernelMenu.kernelUsers.interruptKernel.add({
        id: CommandIDs.interruptKernel,
        isEnabled
      });

      mainMenu.kernelMenu.kernelUsers.reconnectToKernel.add({
        id: CommandIDs.reconnectToKernel,
        isEnabled
      });

//(mainMenu as MainMenu).kernelMenu.clearItems();
//const itm = (mainMenu as MainMenu).kernelMenu.find((i,idx)=>(i.command==="notebook:restart-kernel"));
//var i = 0;
//for (i=0; i<2; i++) 
//TrackerTools.disp_obj(mainMenu.kernelMenu.removeItem("notebook:restart-kernel"));
//TrackerTools.disp_obj(mainMenu.kernelMenu.kernelUsers);
      (mainMenu as MainMenu).kernelMenu.removeItemAt(2);  // remove notebook:restart-kernel menu, bug?
      mainMenu.kernelMenu.kernelUsers.restartKernel.add({
        id: CommandIDs.restartKernel,
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


/**
  Tools for Tracker
*/
namespace TrackerTools {
  //
  export function isEnabled(
    shell: JupyterFrontEnd.IShell,
    tracker: WidgetTracker<BlocklyEditor>
  ): boolean {
    return (
      tracker.currentWidget !== null &&
      tracker.currentWidget === shell.currentWidget
    );
  }

  //
  export function getCurrentWidget(
    tracker: WidgetTracker<BlocklyEditor>,
    shell: JupyterFrontEnd.IShell,
    args: ReadonlyPartialJSONObject
  ): BlocklyEditor | null {
    const widget = tracker.currentWidget;
    const activate = args['activate'] !== false;

    if (activate && widget) {
      shell.activateById(widget.id);
    }

    return tracker.currentWidget;
  }


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
        console.log("+++++++++++++++++++++++++++++++++++");
    }
}


//
const plugins: JupyterFrontEndPlugin<any>[] = [
  plugin,
];
export default plugins;

