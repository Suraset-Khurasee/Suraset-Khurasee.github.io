import Topography from './components/Topography'

function App() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#05070d]">
      <Topography
        className="absolute inset-0"
        color="#6eb7c9"
        lineCount={26}
        lineWidth={1.1}
        elevation={0.75}
        foreground={1}
        scale={3.2}
        detail={0.3}
        tilt={42}
        speed={0.18}
        glow={0.65}
        depthOfField={0.25}
        fog={1}
        hoverEffect="lift"
        clickEffect="pulse"
      />
      <a className="click-link" href="https://suraset-khurasee.github.io/rnd01/">
        CLICK
      </a>
    </main>
  )
}

export default App
