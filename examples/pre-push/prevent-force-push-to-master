#!/bin/bash

# Sometimes it's better to not allow users to make force pushes to some branches.
# It can cause losing of some commits and can be pain for a team.
# If you want to protect from doing such a harmful action then add protected branches to "protected_branches" variable.

protected_branch='(master|dev)' # you can set up multiple protected branches

policy='[Policy] Never force push or delete the '$protected_branch' branch! (Prevented with pre-push hook.)'

parent_pid=$(ps -oppid= -p $PPID)
push_command=$(ps -ocommand= -p $parent_pid)

is_destructive='force|delete|\-f'
will_remove_protected_branch=':'$protected_branch

if ([[ $push_command =~ $is_destructive ]] && [[ $push_command =~ $protected_branch ]]) \
    || [[ $push_command =~ $will_remove_protected_branch ]]
then
  echo $policy
  exit 1
fi
