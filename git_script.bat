@echo off
git add .
git commit -m "update 2D grid component layout controls ( adding features modifying components size and grid size) and fix 3D shape rotations"
git branch -c branche_aya
git checkout branche_aya
git push -u origin branche_aya
git checkout main
git merge branche_aya
echo "Done"
