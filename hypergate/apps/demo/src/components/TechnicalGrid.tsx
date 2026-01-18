export const TechnicalGrid = () => {
    return (
        <div
            className="absolute inset-0 pointer-events-none"
            style={{
                backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 0, 0, 0.015) 1px, transparent 1px)
        `,
                backgroundSize: '60px 60px',
                opacity: 0.3
            }}
        />
    );
};
