extern crate web_sys;
use web_sys::console;

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

pub struct Timer<'a> {
    name: &'a str,
}

impl<'a> Timer<'a> {
    pub fn new(name: &'a str) -> Timer<'a> {
        console::time_with_label(name);
        Timer { name }
    }
}

impl<'a> Drop for Timer<'a> {
    fn drop(&mut self) {
        console::time_end_with_label(self.name);
    }
}


#[wasm_bindgen]
pub struct Plot {
    min_real: f64,
    max_real: f64,
    min_imag: f64,
    max_imag: f64,
    
    pixel_width: u32,
    pixel_height: u32,

    max_iterations: u32,
    divergence_bound: f64,
    pixels: Vec<u8>,
}

#[wasm_bindgen]
impl Plot {
    pub fn calc_pixels(&mut self) {
        let _timer = Timer::new("calc_pixels");
        let mut index = 0;

        let real_range = self.max_real - self.min_real;
        let imag_range = self.max_imag - self.min_imag;
        
        let real_step = real_range / self.pixel_width as f64;
        let imag_step = imag_range / self.pixel_height as f64;

        for row in 0..self.pixel_height {
            let imag_start = self.max_imag - imag_step * row as f64;
            for col in 0..self.pixel_width {
                let real_start = self.min_real + real_step * col as f64;
                let iterations = self.iterate_mandelbrot(real_start, imag_start);
                self.draw_pixel(index, iterations);
                
                index += 4;
            }
        }
    }
    
    pub fn new(pixel_width: u32, pixel_height: u32, min_real: f64, max_real: f64, min_imag: f64, max_imag: f64, max_iterations: u32, divergence_bound: f64) -> Plot {
        let num_pixels = pixel_width * pixel_height * 4;
        let pixels = vec![0; num_pixels as usize];
        Plot {
            pixel_width,
            pixel_height,
            min_real,
            max_real,
            min_imag,
            max_imag,
            max_iterations,
            divergence_bound,
            pixels
        }
    }

    pub fn pixels(&self) -> *const u8 {
        self.pixels.as_ptr()
    }
    
    fn draw_pixel(&mut self, index: usize, iterations: u32) {
        if iterations < self.max_iterations {
            self.pixels[index] = 0;
            self.pixels[index + 1] = 0;
            self.pixels[index + 2] = std::cmp::min::<u32>(128 + iterations, 255) as u8;
            self.pixels[index + 3] = 255
        } else {
            self.pixels[index] = 0;
            self.pixels[index + 1] = 0;
            self.pixels[index + 2] = 0;
            self.pixels[index + 3] = 255;
        }
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
