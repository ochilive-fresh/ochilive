import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'

const viewportMeta = document.querySelector('meta[name="viewport"]')
const defaultViewportContent = viewportMeta?.content
const textEntrySelector = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="hidden"]), textarea, select, [contenteditable="true"]'

const isMobileTextEntry = (target) => {
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
  return isTouchDevice && target instanceof Element && target.matches(textEntrySelector)
}

const updateViewportForPointer = (event) => {
  if (isMobileTextEntry(event.target) && viewportMeta && defaultViewportContent) {
    viewportMeta.content = `${defaultViewportContent}, maximum-scale=1, user-scalable=no`
    return
  }

  restoreViewportZoom()
}

const restoreViewportZoom = () => {
  window.requestAnimationFrame(() => {
    if (!isMobileTextEntry(document.activeElement) && viewportMeta && defaultViewportContent) {
      viewportMeta.content = defaultViewportContent
    }
  })
}

document.addEventListener('pointerdown', updateViewportForPointer, true)
document.addEventListener('focusin', updateViewportForPointer, true)
document.addEventListener('focusout', restoreViewportZoom, true)

createRoot(document.getElementById('root')).render(
  createElement(
    StrictMode,
    null,
    createElement(BrowserRouter, null, createElement(AppErrorBoundary, null, createElement(App, null))),
  ),
)
