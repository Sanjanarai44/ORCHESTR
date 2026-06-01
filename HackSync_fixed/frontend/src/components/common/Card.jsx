function Card({ children, className = "" }) {
  return (
    <div
      className={`
        bg-white
        rounded-xl
        shadow-sm
        border border-[#1B4332]/10
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default Card;