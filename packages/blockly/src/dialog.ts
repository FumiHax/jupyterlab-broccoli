
import { Dialog } from '@jupyterlab/apputils';
import { BlocklyEditor } from './widget';

function _closeDialog(widget: BlocklyEditor): Dialog<unknown> {
  const path = widget.context.path;
  const n = path.lastIndexOf('/');
  const fileName = path.substring(n + 1);
  const trans = widget.trans;

  const dialog = new Dialog({
    title: trans.__('Save your work'),
    body: trans.__('Save changes in "%1" before closing?', fileName),
    buttons: [
      Dialog.cancelButton({ label: trans.__('Cancel') }),
      Dialog.warnButton({ label: trans.__('Discard') }),
      Dialog.okButton({ label: trans.__('Save') })
    ]
  });
  return dialog;
}

export async function closeDialog(widget: BlocklyEditor): Promise<boolean> {
  const dialog = _closeDialog(widget);
  const result = await dialog.launch();
  dialog.dispose();

  if (result.button.label === widget.trans.__('Cancel') || result.button.label === 'Cancel') {
    return Promise.resolve(false);
  }
  // on Save, save the file
  if (result.button.label === widget.trans.__('Save') || result.button.label === 'Save') {
    await widget.save(true);
  }
  return Promise.resolve(true);
}
