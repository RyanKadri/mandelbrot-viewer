extern crate web_sys;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Plot {
    min_real: f64,
    real_range: f64,
    min_imag: f64,
    imag_range: f64,
    
    pixel_width: u32,
    pixel_height: u32,

    max_iterations: u32,
    divergence_bound: f64,
    pixels: Vec<u32>,
}

pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
impl Plot {
    pub fn calc_pixels(&mut self) {
        let mut index = 0;

        let real_step = self.real_range / self.pixel_width as f64;
        let imag_step = self.imag_range / self.pixel_height as f64;

        for row in 0..self.pixel_height {
            let imag_start = self.min_imag + self.imag_range - imag_step * row as f64;
            for col in 0..self.pixel_width {
                let real_start = self.min_real + real_step * col as f64;
                let iterations = self.iterate_mandelbrot(real_start, imag_start);
                self.draw_pixel(index, iterations);
                
                index += 1;
            }
        }
    }
    
    pub fn new(pixel_width: u32, pixel_height: u32, min_real: f64, real_range: f64, min_imag: f64, imag_range: f64, max_iterations: u32, divergence_bound: f64) -> Plot {
        set_panic_hook();
        let num_pixels = pixel_width * pixel_height;
        let pixels = vec![0; num_pixels as usize];
        Plot {
            pixel_width,
            pixel_height,
            min_real,
            real_range,
            min_imag,
            imag_range,
            max_iterations,
            divergence_bound,
            pixels
        }
    }

    pub fn pixels(&self) -> *const u32 {
        self.pixels.as_ptr()
    }
    
    fn draw_pixel(&mut self, index: usize, iterations: u32) {
        let channels: [u8; 4] = if iterations < self.max_iterations {
            let blue = std::cmp::min::<u32>(128 + iterations, 255) as u8;
            [0, 0, blue, 255]
        } else {
            [0, 0, 0, 255]
        };
        self.pixels[index] = u32::from_le_bytes(channels);
    }

    fn iterate_mandelbrot(&self, real_start: f64, imag_start: f64) -> u32 {
        let mut real = 0.0;
        let mut imag = 0.0;
        for n in 0..self.max_iterations {
            let new_real = real * real - imag * imag + real_start;
            imag = 2.0 * real * imag + imag_start;
            real = new_real;
            if real * real + imag * imag > self.divergence_bound {
                return n;
            }
        }
        self.max_iterations
    }
}
