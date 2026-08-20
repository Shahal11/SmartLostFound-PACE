const MyComponent = ({ label, icon }) => {
  const Icon = icon && icon.type ? icon : null; // check if icon is defined and is a React element

  const clonedIcon = Icon ? React.cloneElement(Icon, { size: 16 }) : null; // clone the icon if it's defined and is a React element

  return (
    <div>
      {clonedIcon}
      <span>{label}</span>
    </div>
  );
};