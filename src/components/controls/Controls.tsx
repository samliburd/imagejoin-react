import { type ReactNode } from 'react';

interface ControlsProps {
    children: ReactNode;
}

const Controls = ({ children }: ControlsProps) => {
    return (
        <div id="controls" className="controls">
            {children}
        </div>
    );
};

export default Controls;
