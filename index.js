class Canvas {
  constructor(el) {
    this.el = el;
    this.width = el.width;
    this.height = el.height;

    this.ctx = el.getContext('2d');
    this.image = this.ctx.getImageData(0, 0, this.width, this.height);
  }

  setPixel(x, y, color) {
    let i = 4 * (y * this.width + x);
    this.image.data[i++] = color.r;
    this.image.data[i++] = color.g;
    this.image.data[i++] = color.b;
    this.image.data[i] = 255;
  }

  render() {
    this.ctx.putImageData(this.image, 0, 0);
  }
}

class Color {
  constructor(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  add(other) {
    return new Color(
      this.r + other.r,
      this.g + other.g,
      this.b + other.b,
    );
  }

  scale(scalar) {
    return new Color(
      this.r * scalar,
      this.g * scalar,
      this.b * scalar,
    );
  }
}

class Vec {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize() {
    const length = this.length();
    return new Vec(
      this.x / length,
      this.y / length,
      this.z / length,
    );
  }

  add(other) {
    return new Vec(
      this.x + other.x,
      this.y + other.y,
      this.z + other.z,
    );
  }

  subtract(other) {
    return new Vec(
      this.x - other.x,
      this.y - other.y,
      this.z - other.z,
    );
  }

  scale(scalar) {
    return new Vec(
      this.x * scalar,
      this.y * scalar,
      this.z * scalar,
    );
  }

  dot(other) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }
}

class Film {
  constructor(topLeft, bottomRight) {
    this.topLeft = topLeft;
    this.width = bottomRight.x - topLeft.x;
    this.height = topLeft.y - bottomRight.y;
    this.z = topLeft.z;
  }

  project(x, y) {
    return new Vec(
      this.topLeft.x + (x * this.width),
      this.topLeft.y - (y * this.height),
      this.z,
    );
  }
}

class Camera {
  constructor(eye, film) {
    this.eye = eye;
    this.film = film;
  }

  trace(x, y) {
    const direction = this.film.project(x, y).normalize();
    return new Ray(this.eye, direction);
  }
}

class Ray {
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = direction;
  }

  at(t) {
    return this.origin.add(this.direction.scale(t));
  }
}

const sqr = n => n * n;

class Sphere {
  constructor(center, radius, color, reflectance) {
    this.center = center;
    this.radius = radius;
    this.color = color;
    this.reflectance = reflectance;
  }

  intersect(ray) {
    const oc = ray.origin.subtract(this.center);
    const dot = ray.direction.normalize().dot(oc);

    const a = sqr(dot);
    const b = sqr(oc.length()) - sqr(this.radius);

    if (a < b) {
      return null;
    }

    const sqrt = Math.sqrt(a - b);
    const ts = [
      -dot - sqrt,
      -dot + sqrt,
    ].filter(t => t >= 0);

    if (ts.length > 0) {
      return ts[0];
    } else {
      return null;
    }
  }

  surfaceNormal(point) {
    return point.subtract(this.center).normalize();
  }
}

class Light {
  constructor(center, power) {
    this.center = center;
    this.power = power;
  }

  illuminate(point, normal, spheres) {
    const pointToLight = this.center.subtract(point);
    const length = pointToLight.length();

    const shadowRay = new Ray(point, pointToLight.normalize());
    const occluded = spheres.some(s => {
      const t = s.intersect(shadowRay);
      return t !== null && t > 1e-10 && t < length;
    })

    if (occluded) {
      return 0;
    }

    const cosine = pointToLight.dot(normal) / length;

    const numerator = this.power * cosine;
    const denominator = 4 * Math.PI * sqr(length);

    const power = numerator / denominator;

    return power > 0 ? power : 0;
  }
}

(function() {
  const canvas = new Canvas(document.getElementById('canvas'));

  const eye = new Vec(0, 0, 0.3);
  const film = new Film(new Vec(-0.8, 1.2, 1.3), new Vec(1.2, -0.3, 1.3));
  const camera = new Camera(eye, film);
  const spheres = [
    new Sphere(new Vec(-1, 1, 5), 0.7, new Color(255, 0, 50), 0.5),
    new Sphere(new Vec(1, 1, 5), 0.7, new Color(50, 255, 0), 0.8),
    new Sphere(new Vec(3, 1, 5), 0.7, new Color(50, 100, 255), 0),
    new Sphere(new Vec(-1, 2, 4), 0.2, new Color(220, 220, 75), 0.7),
  ];

  const lights = [
    new Light(new Vec(5, 5, 5), 500),
    new Light(new Vec(-5, 3, 1), 400),
    new Light(new Vec(-0.8, 1.3, 4.1), 2),
  ];

  const background = (ray) => {
    let y = Math.max(0.1, ray.direction.y);

    return new Color(255, 255, 255).scale(y);
  }

  const render = () => {
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const ray = camera.trace(x / canvas.width, y / canvas.height);

        const color = trace(ray, 5) || background(ray)

        canvas.setPixel(x, y, color);
      }
    }

    canvas.render();
  }

  const trace = (ray, remainingCalls) => {
    if (remainingCalls <= 0) {
      return null;
    }

    let min = { t: Infinity, sphere: null };

    for (const sphere of spheres) {
      const t = sphere.intersect(ray);
      if (t !== null && t < min.t) {
        min = { t, sphere };
      }
    }

    const { t, sphere } = min;
    if (sphere) {
      const intersection = ray.at(t);
      const normal = sphere.surfaceNormal(intersection);

      const energy = lights.reduce((acc, light) => (
        acc + light.illuminate(intersection, normal, spheres)
      ), 0);

      const shade = sphere.color.scale(energy);

      const dot = ray.direction.dot(normal);
      const rPrime = ray.direction.subtract(normal.scale(2 * dot));
      const justOutsideSphere = intersection.add(normal.scale(1e-10));

      const reflectionRay = new Ray(justOutsideSphere, rPrime);
      const reflectionColor = trace(reflectionRay, remainingCalls - 1) || new Color(0, 0, 0);

      const albedo = sphere.color.scale(sphere.reflectance / 255);

      return shade.scale(1 - sphere.reflectance)
        .add(new Color(
          reflectionColor.r * albedo.r,
          reflectionColor.g * albedo.g,
          reflectionColor.b * albedo.b,
        ));
    } else {
      return null;
    }
  }

  render();

  document.addEventListener('keydown', e => {
    switch (e.key) {
      case 'a':
      case 'h':
        eye.x -= 0.1;
        film.topLeft.x -= 0.1;
        break;
      case 'j':
        eye.y -= 0.1;
        film.topLeft.y -= 0.1;
        break;
      case 'k':
        eye.y += 0.1;
        film.topLeft.y += 0.1;
        break;
      case 'd':
      case 'l':
        eye.x += 0.1;
        film.topLeft.x += 0.1;
        break;
      case 'w':
        eye.z += 0.1;
        film.z += 0.1;
        break;
      case 's':
        eye.z -= 0.1;
        film.z -= 0.1;
        break;
      default:
        return;
    }

    render();
    e.preventDefault();
  });
})();
