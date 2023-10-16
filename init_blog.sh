#!/bin/bash
blog='gwunderwelt'
post='2023-09-03-better-in-belize'

image_path="./assets/images/$blog/$post"
blog_path="$blog/_posts/$post.md2"
toplevel_files=$'  - dirname:\n    images:\n'
subdir_files=''
for entry in "$image_path"/*
do
  if [ -d "$entry" ];then
    subdir_files+='  - dirname: '$(basename $entry)$'\n'$'    images:\n'
    for subentry in "$entry"/*
    do
      if [ -f "$subentry" ];then
          subdir_files+='      - {filename: '$(basename $subentry)$', caption: , alt: }\n'
      fi
    done
  elif [ -f "$entry" ];then
    toplevel_files+='      - {filename: '$(basename $entry)$', caption: , alt: }\n'
  fi
done

cat << EOF > $blog_path
---
layout: post
lang: de
title:  
preview_image_id: 
preview_text: |
  
image_metadata:
$toplevel_files
$subdir_files
---
EOF

