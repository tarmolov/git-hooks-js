## Pull requests and Code contributions

* Tests must pass.
* Follow [our coding style](https://github.com/yandex/codestyle/blob/master/javascript.md) (jscs and jshint will help you).
* If you fix a bug, add a test.
* If you can't fix a bug, file an [issue](https://github.com/tarmolov/git-hooks-js/issues/new) with the steps to reproduce, the expected and the actual results.

## Library structure
```
.git-hooks      Git hooks
bin             Executable file
lib             Library code
tests           Tests

## How to develop
### Create your own copy of bla
```
git clone https://github.com/tarmolov/git-hooks.git
npm install
```
**Note.** It's better to create a fork, if you plan to make a pull request.

### Run tests
```
npm test
```
