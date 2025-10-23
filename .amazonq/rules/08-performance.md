# Performance Guidelines

## Bundle Size

- Monitor and optimize bundle size
- Use `vite-bundle-visualizer` to analyze
- Keep vendor bundles under control
- Remove unused dependencies

## Code Splitting

- Lazy load routes with React.lazy()
- Split heavy components
- Use dynamic imports for large libraries
- Implement route-based code splitting

## Image Optimization

- Use WebP format for images
- Implement lazy loading
- Use proper image sizing and srcset
- Compress images before deployment

## Three.js Performance

- Limit particle count based on device capabilities
- Use instancing for repeated geometries
- Dispose of geometries and materials properly
- Use LOD (Level of Detail) when appropriate
- Limit shadow casting objects
- Use texture compression

## API Calls

- Implement caching strategies
- Use debouncing for user input
- Batch API requests when possible
- Implement pagination for large datasets
- Use optimistic updates for better UX
