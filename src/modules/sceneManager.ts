export const loadScene = (sceneId: number) => {
  const iframe = document.getElementById('bg-iframe') as HTMLIFrameElement;
  if (iframe) {
    iframe.src = `/assets/3d-scenes/scene${sceneId}.html`;
  }
};
