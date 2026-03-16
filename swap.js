const fs = require('fs');
const content = fs.readFileSync('src/pages/Explore.tsx', 'utf-8');

const rightStart = content.indexOf('{/* Right Column - People Section */}');
const rightEnd = content.indexOf('</div> {/* End Right Column */}') + '</div> {/* End Right Column */}'.length;

const leftStart = content.indexOf('{/* Left Column - Research Papers */}');
const leftEnd = content.indexOf('</div> {/* End Left Column */}') + '</div> {/* End Left Column */}'.length;

if (rightStart > 0 && leftStart > 0 && rightStart > leftStart) {
    const beforeLeft = content.substring(0, leftStart);
    const leftBlock = content.substring(leftStart, leftEnd);
    const rightBlock = content.substring(rightStart, rightEnd);
    const afterRight = content.substring(rightEnd);

    let betweenBlock = content.substring(leftEnd, rightStart);

    let newRightBlock = rightBlock.replace('xl:col-span-1 border-t xl:border-t-0 xl:border-l border-border pt-8 xl:pt-0 xl:pl-8 space-y-6', 'xl:col-span-1 space-y-6');
    let newLeftBlock = leftBlock.replace('xl:col-span-3 space-y-6', 'xl:col-span-3 border-t xl:border-t-0 xl:border-l border-border pt-8 xl:pt-0 xl:pl-8 space-y-6');
    
    newRightBlock = newRightBlock.replace('Right Column - People Section', 'Left Column - People Section').replace('End Right Column', 'End Left Column');
    newLeftBlock = newLeftBlock.replace('Left Column - Research Papers', 'Right Column - Research Papers').replace('End Left Column', 'End Right Column');

    const newContent = beforeLeft + newRightBlock + betweenBlock + newLeftBlock + afterRight;
    fs.writeFileSync('src/pages/Explore.tsx', newContent);
    console.log('Swapped successfully');
} else {
    console.log('Could not find column bounds');
}
