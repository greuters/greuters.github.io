#!/bin/bash
if [ $# -ne 2 ]; then
    echo $0: usage: init_blog.sh blog post
    exit 1
fi

blog=$1
post=$2

image_path="./assets/images/$blog/$post"
blog_path="$blog/_posts/$post.md"
toplevel_files=$'  - dirname:\n    images:\n'
subdir_files=''
for entry in "$image_path"/*
do
  if [ -d "$entry" ];then
    subdir_files+='  - dirname: '$(basename "$entry")$'\n'$'    images:\n'
    for subentry in "$entry"/*
    do
      if [ -f "$subentry" ];then
          subdir_files+='      - {filename: "'$(basename "$subentry")$'", caption: "", alt: ""}\n'
      fi
    done
  elif [ -f "$entry" ];then
    toplevel_files+='      - {filename: "'$(basename "$entry")$'", caption: "", alt: ""}\n'
  fi
done

cat << EOF > $blog_path
---
layout: post
lang: de
title:  
preview_image_id: 
preview_text: |
  
track_number: 
spread_direction: ""
image_metadata:
$toplevel_files
$subdir_files
---

{%- comment -%}
<div class="flow-root">
  {% include image.liquid id="image.jpg" class="float-inline-start"%}

  Text
</div>
{% include image-divider.html ids="image.jpg" %}
{% include inline-gallery.html collection="gallery" %}
{%- endcomment -%}
EOF

