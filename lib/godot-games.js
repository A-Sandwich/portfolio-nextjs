import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const gamesDriectory = path.join(process.cwd(), 'public/games');

export function getSortedGameData() {
  // Get file names under /posts
  const fileNames = fs.readdirSync(gamesDriectory);
  const allPostsData = fileNames.map((fileName) => {
    // Remove ".md" from file name to get id
    const id = fileName;

    // Read markdown file as string
    const fullPath = path.join(gamesDriectory, fileName);
    const fileContents = fs.readFileSync(fullPath+"/info.md", 'utf8');

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    // Combine the data with the id
    return {
      id,
      ...matterResult.data,
    };
  });
  // Sort posts by date
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getAllGameIds() {
    const fileNames = fs.readdirSync(gamesDriectory);
  
    // Returns an array that looks like this:
    // [
    //   {
    //     params: {
    //       id: 'ssg-ssr'
    //     }
    //   },
    //   {
    //     params: {
    //       id: 'pre-rendering'
    //     }
    //   }
    // ]
    return fileNames.map((fileName) => {
      return {
        params: {
          id: fileName,
        }
      };
    });
  }

  export async function getGameData(id) {
    const fullPath = path.join(gamesDriectory, `${id}/index.html`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

   
     // Combine the data with the id and contentHtml
     return {
       id,
       fileContents
     };
  }