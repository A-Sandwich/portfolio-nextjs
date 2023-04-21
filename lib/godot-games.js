import fs from 'fs';
import path from 'path';

const gamesDriectory = path.join(process.cwd(), 'public/games');

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
        id: fileName,
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