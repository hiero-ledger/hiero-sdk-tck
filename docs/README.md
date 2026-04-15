---
title: Local Development Guide
nav_order: 11
---

# Local Development Guide

This guide explains how to build the site locally and integrate new markdown (`.md`) pages properly into the site structure.

## Building the Site Locally

To preview the site before committing changes:

1. Navigate to the `docs` directory located at `root/docs/`
   ```sh
   cd docs
   ```
2. Install dependencies (you may need to use `sudo bundle install`, if your ruby version is installed globally):
   ```sh
   bundle install
   ```
3. Serve the site locally:
   ```sh
   bundle exec jekyll serve
   ```
   The site will be available at `http://localhost:4000/`.

## Adding a New Page

To add a new markdown page:

1. Create the `.md` file in the appropriate location.
2. Add the required front matter at the top of the file:

   ```yaml
   ---
   title: "Your Page Title"
   parent: "Parent Page Name" # Omit this if the page is not part of a section
   nav_order: 5 # Adjust order as needed
   ---
   ```

### Adding a New Parent (Section)

 <div class="note">
    Sections group related pages together, make sure that files related to a specific service are in the corresponding section.
 </div>

If a new section (parent page) is needed:

1. Create a new directory.
2. Move your `.md` file into this directory.
3. Create an `index.md` file inside the new directory.
4. Add the required front matter to `index.md`:

   ```yaml
   ---
   title: "New Section Title"
   nav_order: 3 # Adjust order as needed
   ---
   ```

## Styling Options

The site uses the [Just the Docs](https://just-the-docs.github.io/just-the-docs/) theme, which provides additional styling options:

- **Notes and Warnings (uses embedded html):**

  <div class="note">
    <strong>Note:</strong> This is an important note.
  </div>

  <div class="tip">
    <strong>Tip:</strong> This is an cool tip.
  </div>

  <div class="warning">
    <strong>⚠ Warning:</strong> This is an important warning.
  </div>

- **Inline Code and Code Blocks:**  
  Use backticks for inline code: `` `example` ``  
  Use triple backticks for multi-line code blocks and specify the language for syntax highlighting.

  ````
  ```(programming language here, for syntax highlighting)
  x = "code goes here"
  # on multiple lines!
  ```
  ````

  result:

  ```python
  x = "code goes here"
  # on multiple lines!
  ```

- **Tables:**

  | Column 1 | Column 2 |
  | -------- | -------- |
  | Value 1  | Value 2  |

For more styling options, see the [Just the Docs documentation](https://just-the-docs.github.io/just-the-docs/).
