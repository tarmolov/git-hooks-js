# git-hooks-js [![NPM version](https://badge.fury.io/js/git-hooks.svg)](http://badge.fury.io/js/git-hooks)

It's inspired by [git-hooks](https://github.com/icefox/git-hooks) but has several differences:

  * Created for nodejs projects and written in nodejs not bash.
  * Installs and removes hooks automatically during the package installation/uninstallation.
  * Finds hooks only in `.githooks` directory in the project.
  * Should be installed as a local package and of course it would work only for git repositories.
  * Well-tested and ready for use :)

## Installation
Run in the root of your project.
```
npm install git-hooks --save-dev
mkdir .githooks
```
See example of a hook in [.githooks](https://github.com/tarmolov/git-hooks-js/tree/master/.githooks) directory.
