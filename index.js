#!/usr/bin/env node

const Hyperbeam = require('hyperbeam')
const { spawn } = require('child_process')

if (process.argv.length < 3) {
  console.error('Usage: hyperphone <topic>')
  process.exit(1)
}

const osAudioMap = {
  linux: 'alsa',
  darwin: 'avfoundation',
  windows: 'dshow'
}

let record
let play

const beam = new Hyperbeam('hyperphone ' + process.argv.slice(2).join(' '))

beam.on('remote-address', function ({ host, port }) {
  if (!host) console.error('[hyperbeam] Could not detect remote address')
  else console.error('[hyperbeam] Joined the DHT - remote address is ' + host + ':' + port)
  if (port) console.error('[hyperbeam] Network is holepunchable \\o/')
})

beam.on('connected', function () {
  console.error('[hyperbeam] Success! Encrypted tunnel established to remote peer')
  record = spawn('ffmpeg', ['-f', osAudioMap[process.platform], '-i', 'default', '-fflags', 'nobuffer', '-ar', '44100', '-vn', '-f', 'mpegts', '-v', '8', '-hide_banner', '-'], {
    stdio: ['inherit', 'pipe', 'inherit' ]
  })
  play = spawn('ffplay', ['-f', 'mpegts', '-probesize', '32', '-analyzeduration', '0', '-af', 'adeclick=w=10:o=50', '-i', '-v', '8', '-hide_banner', '-nodisp', '-'], {
    stdio: ['pipe', 'inherit', 'inherit' ]
  })
  record.stdout.pipe(beam).pipe(play.stdin)
})

beam.on('end', () => {
  beam.end()
  if (record) record.kill()
  if (play) play.kill()
})

beam.resume()
beam.pause()

process.once('SIGINT', () => {
  if (record) record.kill()
  if (play) play.kill()
  if (!beam.connected) closeASAP()
  else beam.end()
})

function closeASAP () {
  console.error('[hyperbeam] Shutting down beam...')

  const timeout = setTimeout(() => process.exit(1), 2000)
  beam.destroy()
  beam.on('close', function () {
    clearTimeout(timeout)
  })
}
