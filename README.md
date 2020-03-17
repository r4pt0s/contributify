# Contributify Action

## What is it for?

This action was designed to make lives easier for a Maintainer by adding contributors to a file which is stored into the root directory of the master branch.

## Limitiations

Because of the way the Github API is designed now, it is not possible to make this action work with forks because of security concerns.
It only works by adding a Contributor at least as Collaborator and granting read/write access to a branch.

## Version 1

- Adds a new branch called contributify
- Create/Update a file called CONTRIBUTORS.md
- Action fires a new PR with changes of the CONTRIBUTORS.md file on merging another branch into master
- Removes created contributify branch after it is merged into master


## How to use it?

Here is a basic sample workflow file which has to placed at ```.github/workflows```. 
The prefered name would be main.yml

```
name: "Contributify BOT (Github Action)"

on: 
  pull_request:
    types: [closed]
    branches: 
      - master

jobs:
  contributify_bot:
    runs-on: ubuntu-latest
    steps:
    - name: 'Use checkout action'
      uses: actions/checkout@v2
      with:
        ref: master
    - name: 'Install node'
      uses: actions/setup-node@v1
    - name: 'run contributify bot'
      uses: r4pt0s/contributify@v1 
      with:
        repo-token: ${{secrets.GITHUB_TOKEN}}
```  

## Inputs

### `repo-token`
**Required** The current Repository token to allow the action to write files to repository
