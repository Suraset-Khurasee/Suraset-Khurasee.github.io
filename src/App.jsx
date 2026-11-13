import Topography from './components/Topography'
import DodgeField from './components/DodgeField'

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
      <div className="dare-field">
        <DodgeField
          inkColor="#d9fbfc"
          contrastColor="#12313b"
          fieldHeight={180}
          reach={84}
          radius={140}
          patience={4}
          caughtHoldMs={10000}
          href="https://suraset-khurasee.github.io/rnd01/"
        />
      </div>
    </main>
  )
}

export default App
