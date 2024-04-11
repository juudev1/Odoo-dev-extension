const FieldListItem = ({ field }) => {
    let value;
    if (Array.isArray(field.value)) {
        value = field.value.join(', ');
    } else if (typeof field.value === 'object' && field.value !== null) {
        value = JSON.stringify(field.value);
    } else {
        value = field.value;
    }


    return (
        <div class="max-w-sm p-3 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">

            <h5 class="text-sm font-semibold tracking-tight text-gray-900">
                {field.name}
            </h5>
            <p class="break-words font-normal text-gray-500 dark:text-gray-400">
                {value}
            </p>
            <a href="#" class="inline-flex font-medium items-center text-blue-600 hover:underline">
                {field.type}
            </a>
        </div>
    )
}

export default FieldListItem;