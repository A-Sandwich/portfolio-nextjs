import { getAllGameIds, getGameData } from '../../lib/godot-games';


export async function getStaticProps({ params }) {
    // Add the "await" keyword like this:
    const gameData = await getGameData(params.id);
  
    return {
      props: {
        gameData,
      },
    };
  }

export async function getStaticPaths() {
  const paths = getAllGameIds();
  return {
    paths,
    fallback: false,
  };
}

export default function Game({ gameData }) {
  return {gameData}
}