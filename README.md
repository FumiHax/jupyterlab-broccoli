# jupyterlab-broccoli
## Broccoli
* jupyterlab-broccoli is patch for jupyterlab-blockly
  * Added several icons, including a save icon.
  * Added save confirmation dialog when close.
  * Added confirmation dialog for kernel restart.
  * Toolbox localization (Japanese language only now).
  * New split layout for panel.
  * Save using kernel information to file.
  * Fixed a few bugs.
* https://github.com/QuantStack/jupyterlab-blockly
* Corresponding version is jupyterlab-blockly 0.3.0a

## Screen Shot
<img width="80%" src="https://github.com/fiseki/Jupyterlab-Broccoli/assets/95947474/98db3301-d557-43d2-9e08-f5e17163462b">
<br>
<br>
<img width="80%" src="https://github.com/fiseki/Jupyterlab-Broccoli/assets/95947474/edd7775e-46d5-4693-8659-6b47a581b968">

## Bugs
* Sometimes (for example, when reloading) the layout of the screen is corrupted, so please reload or open the file again.
* Copy to clipboard by right mouse button menu in Output View does not work either (jupyterlab-blockly bug).


# jupyterlab_blockly

[![Github Actions Status](https://github.com/QuantStack/jupyterlab-blockly/actions/workflows/build.yml/badge.svg)](https://github.com/quantstack/jupyterlab-blockly/actions/workflows/build.yml)
[![lite-badge](https://jupyterlite.rtfd.io/en/latest/_static/badge-launch.svg)](https://jupyterlab-blockly.readthedocs.io/en/latest/lite/lab/index.html?path=example.jpblockly)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/quantstack/jupyterlab-blockly/main?urlpath=lab)


Blockly extension for JupyterLab.

## Blockly

Blockly is a library from Google for building beginner-friendly block-based programming languages.

Docs: https://developers.google.com/blockly/guides/overview
Repo: https://github.com/google/blockly

## Requirements

- JupyterLab == 3.6

## Install

To install the extension, execute:

```bash
conda install -c conda-forge jupyterlab-blockly
```

#### Kernels

- ipykernel
- xeus-python
- xeus-lua
- [JavaScript](https://github.com/n-riesco/ijavascript#installation)
- [JavaScript](https://github.com/yunabe/tslab)

## Uninstall

To remove the extension, execute:

```bash
conda uninstall -c conda-forge jupyterlab-blockly
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
micromamba create -n blockly -c conda-forge python nodejs=18 pre-commit jupyterlab==3.6 jupyter-packaging jupyterlab-language-pack-es-ES jupyterlab-language-pack-fr-FR ipykernel xeus-python xeus-lua
micromamba activate blockly
# Clone the repo to your local environment
# Change directory to the jupyterlab_blockly directory
# Installing pre-commit to run command when adding commits
pre-commit install
# Install package in development mode
pip install -e ".[dev]"
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
pip uninstall jupyterlab_blockly
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab-blockly` within that folder.

### Packaging the extension

See [RELEASE](RELEASE.md)
