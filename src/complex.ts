export function z(real: number, imag: number): Complex {
    return { real, imag }
}

export function mult(c1: Complex, c2: Complex): Complex {
    return {
        real: c1.real * c2.real - c1.imag * c2.imag,
        imag: c1.real * c2.imag + c1.imag * c2.real
    }
}

export function add(c1: Complex, c2: Complex): Complex {
    return {
        real: c1.real + c2.real,
        imag: c1.imag + c2.imag
    }
}

export function absSq(n: Complex) {
    return n.real ** 2 + n.imag ** 2;
}

export function print(c:Complex) {
    const imagPart = c.imag < 0 
        ? ` - ${c.imag * -1}i`
        : ` + ${c.imag}i`;

    return `${c.real}${imagPart}`;
        
}

export interface Complex {
    real: number;
    imag: number;
}