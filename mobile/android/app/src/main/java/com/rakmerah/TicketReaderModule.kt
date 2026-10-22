package com.rakmerah

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

class TicketReaderModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName() = "TicketReader"

  @ReactMethod
  fun read(uriString: String, promise: Promise) {
    Thread {
      try {
        val bitmap = loadBitmap(uriString) ?: throw IllegalArgumentException("Gambar tidak terbaca.")
        val scaled = scale(bitmap, 1600)
        val barcodes = linkedSetOf<String>()
        val texts = mutableListOf<String>()
        for (deg in intArrayOf(0, 90, 270)) {
          val frame = if (deg == 0) scaled else rotate(scaled, deg.toFloat())
          val image = InputImage.fromBitmap(frame, 0)
          val codes = Tasks.await(BarcodeScanning.getClient().process(image))
          for (c in codes) {
            val v = c.rawValue?.trim().orEmpty()
            if (v.isNotEmpty()) barcodes.add(v)
          }
          val text = Tasks.await(
            TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).process(image),
          )
          if (text.text.isNotBlank()) texts.add(text.text)
          if (barcodes.size >= 2 && texts.isNotEmpty()) break
        }
        val map = Arguments.createMap()
        val arr = Arguments.createArray()
        barcodes.forEach { arr.pushString(it) }
        map.putArray("barcodes", arr)
        map.putString("text", texts.maxByOrNull { it.length } ?: "")
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("READ_FAIL", e.message, e)
      }
    }.start()
  }

  private fun loadBitmap(raw: String): Bitmap? {
    val path = raw.removePrefix("file://")
    return if (raw.startsWith("content://")) {
      ctx.contentResolver.openInputStream(Uri.parse(raw))?.use { BitmapFactory.decodeStream(it) }
    } else {
      BitmapFactory.decodeFile(path)
    }
  }

  private fun scale(src: Bitmap, maxSide: Int): Bitmap {
    val w = src.width
    val h = src.height
    val long = maxOf(w, h)
    if (long <= maxSide) return src
    val scale = maxSide.toFloat() / long
    return Bitmap.createScaledBitmap(src, (w * scale).toInt(), (h * scale).toInt(), true)
  }

  private fun rotate(src: Bitmap, deg: Float): Bitmap {
    val m = Matrix()
    m.postRotate(deg)
    return Bitmap.createBitmap(src, 0, 0, src.width, src.height, m, true)
  }
}
