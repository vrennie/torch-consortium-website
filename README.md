# TORCH Consortium website

This repository contains the new TORCH website, rebuilt from the Squarespace XML export. It uses Markdown files for easy content changes.

## Edit a page without coding

1. Open the content/pages folder on GitHub.
2. Find your page, for example content/pages/what-we-do.md or content/pages/publications.md.
3. Click the pencil (Edit this file).
4. Edit the text. Normal paragraphs work as written; prefix a heading with #; wrap words in ** for bold; links use [visible text](https://example.com).
5. Click Commit changes. The GitHub Pages workflow will rebuild the site once Pages is enabled.

Each page starts with a small header containing title, section, and draft. You can change the title, but keep the filename unchanged if you want to preserve that page's original URL. To create a new page, add a new Markdown file with the same format and set its section to Projects, People, About, PARR-TB, or Vacancies. It will appear on the corresponding overview page automatically.

Navigation links are separately editable in data/navigation.json. The design lives in public/site.css. Images are listed in data/media.json, which maps Squarespace image addresses to their own downloadable assets.

## Development

Requires Node.js 22 or later:

    npm install
    npm run fetch-media
    SITE_BASE_PATH=/ npm run build
    npm run preview

Open http://localhost:8000.

## Publish

Go to Settings > Pages > Build and deployment and choose GitHub Actions. The deploy workflow runs whenever the main branch changes. With no custom domain the address is expected to be https://vrennie.github.io/torch-consortium-website/.

GitHub Free requires a public repository to deploy GitHub Pages. GitHub Pro/Team can deploy from private repositories. You can keep the repository private while building. Do not change the existing TORCH domain's DNS until the new site is verified.

Later, when ready to connect torch-consortium.com, add a root-level CNAME file containing only torch-consortium.com, configure the custom domain in Settings > Pages and change DNS at your domain registrar. The build automatically switches to root-relative URLs when CNAME is present.

## Migration caveats

- The XML contained 81 published page records. Content is imported as editable Markdown. Several old demonstration or hidden pages were imported with draft: true.
- Squarespace styles, forms, embedded services and widgets are not included in the XML. The new site uses a shared responsive design, not an exact copy.
- The XML links images to Squarespace CDN rather than including the image files. The deploy workflow downloads the listed images into the generated website. Keep a separate backup of these assets, and ideally commit the downloaded files to public/assets/media for lasting independence from Squarespace.
- Squarespace contact forms will need a replacement service before they can collect submissions.
- Review older biographies, vacancy pages, document links, and embedded media before switching over.
- The XML archive contains author email metadata. Before making this repository public, audit the original XML and Git history for private metadata. Deleting an XML file in a subsequent commit does not erase it from older commits.
